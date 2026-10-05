const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {compare}=require('../answer-check.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync('concepts.js','utf8'),context);
const concepts=context.window.ANSWER_CONCEPTS;
test('Every card has curated concepts and synonyms',()=>{
 assert.deepEqual(Object.keys(concepts).sort(),require('../cards.json').cards.map(c=>c.id).sort());
 for(const groups of Object.values(concepts))for(const c of groups)assert.ok(c.label&&c.terms.length);
});
test('Synonyms, umlauts and explicit word forms match, without substrings',()=>{
 assert.ok(compare('Ackerbau schafft Ueberschüsse und Kooperation.',concepts.H03).found.includes('Landwirtschaft'));
 assert.ok(compare('Die Selbstlaute gehören zur gesprochenen Sprache.',concepts.S03).found.includes('Vokale'));
 assert.ok(compare('Eine Rangordnung verteilt Macht.',concepts.G11).found.includes('Rangordnung'));
 assert.equal(compare('Regen über Ägypten',concepts.R19).found.includes('Re'),false);
 assert.ok(compare('Fruchtbare Erde',concepts.H04).found.includes('fruchtbar'));
});
test('Negation is flagged; numbers and unrelated answers are not guessed',()=>{
 assert.equal(compare('Der Nil bringt kein Wasser.',concepts.H04).caution,true);
 assert.equal(compare('Pizza schmeckt gut',concepts.H04).found.length,0);
 assert.equal(compare('42 Minuten',concepts.B11).found.length,0);
 assert.equal(compare('4 Minuten 12 Sekunden',concepts.B11).found.length,1);
});
