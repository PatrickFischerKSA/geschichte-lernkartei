const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'cards.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root, 'coverage.json'), 'utf8'));
test('Alle Karten sind vollständig und haben eindeutige Kennungen, Quellen und Lernziele', () => {
  assert.equal(data.cards.length, 112);
  assert.equal(new Set(data.cards.map(c => c.id)).size, 112);
  for (const c of data.cards) {
    for (const key of ['id','topic','question','pages','origin','status']) assert.ok(c[key], `${c.id}: ${key}`);
    assert.ok(c.answer.length && c.answer.every(p => typeof p === 'string' && p.length > 15));
    assert.ok(c.goals.length);
    assert.ok(c.goals.every(id => data.goals.some(g => g.id === id)));
    assert.ok(c.links.every(id => data.sources[id]?.url.startsWith('https://')));
    if (c.image) assert.ok(fs.existsSync(path.join(root, 'assets', c.image)));
    assert.ok(['abgeglichen','praezisiert','ergaenzt','offen'].includes(c.status));
  }
});
test('Alle Lernziele, 15 Kapitelaufgaben und Film-/Prüfungsteilaufgaben sind zugeordnet', () => {
  assert.equal(data.goals.length, 14);
  assert.equal(coverage.filter(r => /^K\d/.test(r.id)).length, 15);
  assert.equal(coverage.filter(r => /^F\d/.test(r.id)).length, 7);
  assert.equal(coverage.filter(r => /^M\d/.test(r.id)).length, 3);
  assert.equal(coverage.filter(r => /^P\d/.test(r.id)).length, 12);
  const ids = new Set(data.cards.map(c => c.id));
  for (const r of coverage) assert.ok(r.cards.length && r.cards.every(id => ids.has(id)), r.id);
  for (const g of data.goals) assert.ok(coverage.some(r => r.id === g.id && r.cards.length));
});
test('Browserdaten stimmen mit der editierbaren JSON-Datei überein', () => {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  assert.equal(JSON.stringify(context.window.LEARNING_DATA), JSON.stringify(data));
});
test('Fehlende Quellen werden nicht als bestätigte Antworten ausgegeben', () => {
  assert.deepEqual(data.cards.filter(c => c.status === 'offen').map(c => c.id), ['B08','Q22']);
  for (const id of ['E01','E02','E03']) {
    const c = data.cards.find(c => c.id === id); assert.equal(c.status, 'ergaenzt'); assert.ok(c.links.length);
  }
  assert.ok(data.cards.find(c => c.id === 'Q13').links.includes('hunefer'));
});
test('Rechenaufgabe: Takt und mittlere Masse mit angegebenen Annahmen', () => {
  assert.equal(20 * 365 * 24 * 60 / 2500000, 4.2048);
  assert.equal(5995000 / 2500000, 2.398);
  assert.equal(Math.round(20 * 365 * 10 * 3600 / 2500000), 105);
});
test('Jede Karte hat ein Niveau; alle drei Niveaus sind vertreten', () => {
  const levels = ['basis','vertieft','profi'];
  for (const c of data.cards) assert.ok(levels.includes(c.level), c.id);
  for (const level of levels) assert.ok(data.cards.some(c => c.level === level));
});
