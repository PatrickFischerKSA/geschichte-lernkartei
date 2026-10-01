/* No network calls: content and learning progress stay in this browser. */
(() => {
  'use strict';
  const { cards, goals, sources } = window.LEARNING_DATA;
  const $ = id => document.getElementById(id);
  const KEY = 'geschichte-zum-wenden:v1';
  const statuses = { abgeglichen: 'Dossierabgleich', praezisiert: 'Präzisiert / korrigiert', ergaenzt: 'Ergänzend geprüft', offen: 'Quelle fehlt' };
  let progress = {}, topic = 'all', order = cards.map(c => c.id), selection = [], index = 0, flipped = false;
  const validIds = new Set(order);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') for (const [id, value] of Object.entries(saved)) {
      if (validIds.has(id) && ['known', 'again'].includes(value)) progress[id] = value;
    }
  } catch { $('storage-warning').hidden = false; }
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => s.toLocaleLowerCase('de-CH').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
  const topicNames = [...new Set(cards.map(c => c.topic))];
  const topics = [{ name:'Alle Themen', value:'all', count:cards.length }, ...topicNames.map(t => ({ name:t, value:t, count:cards.filter(c => c.topic === t).length }))];
  for (const t of topics) {
    const b = document.createElement('button'); b.className = 'topic-button'; b.dataset.topic = t.value;
    b.innerHTML = `<span>${escape(t.name)}</span><span>${t.count}</span>`;
    b.addEventListener('click', () => { topic = t.value; index = 0; refresh(); });
    $('topic-list').append(b);
  }
  for (const g of goals) {
    const o = document.createElement('option'); o.value = g.id; o.textContent = `${g.id} · ${g.title}`; $('goal-filter').append(o);
    const n = cards.filter(c => c.goals.includes(g.id)).length;
    const item = document.createElement('article'); item.className = 'goal-item';
    item.innerHTML = `<p class="eyebrow">${g.id} · ${n} KARTEN</p><h2>${escape(g.title)}</h2><p>${escape(g.description)}</p><button>Dieses Lernziel üben →</button>`;
    item.querySelector('button').addEventListener('click', () => { resetFilters(); $('goal-filter').value = g.id; refresh(); switchView(false); $('flip').focus(); });
    $('goal-cards').append(item);
  }
  $('status-summary').innerHTML = Object.entries(statuses).map(([s, label]) => `<span>${cards.filter(c => c.status === s).length} ${label}</span>`).join('');
  $('bibliography').innerHTML = Object.values(sources).map(s => `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></li>`).join('');
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { $('storage-warning').hidden = false; } }
  function updateProgress() {
    const n = Object.values(progress).filter(v => v === 'known').length;
    $('progress').value = n; $('progress').max = cards.length; $('progress-text').textContent = `${n} / ${cards.length}`;
  }
  function filtered() {
    const search = norm($('search').value.trim()), mode = $('mode').value, goal = $('goal-filter').value;
    const byId = new Map(cards.map(c => [c.id, c]));
    return order.map(id => byId.get(id)).filter(c =>
      (topic === 'all' || c.topic === topic) &&
      (goal === 'all' || c.goals.includes(goal)) &&
      (!search || norm([c.question, ...c.answer, c.topic, c.note, c.id, c.origin].join(' ')).includes(search)) &&
      (mode === 'all' || (mode === 'new' && !progress[c.id]) || (mode === 'notes' && c.status !== 'abgeglichen') || (mode === 'open' && c.status === 'offen') || progress[c.id] === mode)
    );
  }
  function resizeCard() {
    const face = flipped ? $('back') : $('front');
    $('card').style.height = `${face.scrollHeight}px`;
  }
  function setFlip(value) {
    flipped = value;
    $('card').classList.toggle('flipped', value);
    $('front').inert = value; $('front').setAttribute('aria-hidden', String(value));
    $('back').inert = !value; $('back').setAttribute('aria-hidden', String(!value));
    $('flip').setAttribute('aria-expanded', String(value));
    $('flip').innerHTML = `${value ? 'Zur Frage zurück' : 'Antwort aufdecken'} <span aria-hidden="true">↻</span>`;
    $('rating').hidden = !value;
    resizeCard();
  }
  function render() {
    const total = selection.length;
    $('empty').hidden = total > 0; $('card-region').hidden = !total; $('shuffle').disabled = total < 2;
    $('deck-count').textContent = `${total} ${total === 1 ? 'Karte' : 'Karten'} in deiner Auswahl`;
    if (!total) {
      $('empty-title').textContent = ['again','new'].includes($('mode').value) ? 'Dieser Stapel ist leer.' : 'Keine passenden Karten';
      $('empty-text').textContent = $('mode').value === 'again' ? 'In dieser Auswahl gibt es keine Karten mit «Noch üben». Du kannst zu allen Karten wechseln.' : 'Passe die Auswahl an oder setze die Filter zurück.';
      return;
    }
    index = Math.max(0, Math.min(index, total - 1));
    const c = selection[index];
    $('topic-label').textContent = c.topic; $('card-id').textContent = c.id;
    $('question').textContent = c.question; $('origin').textContent = c.origin;
    $('answer').innerHTML = c.answer.map(p => `<p>${escape(p)}</p>`).join('');
    $('status-label').textContent = statuses[c.status];
    $('answer-note').hidden = !c.note; $('answer-note').textContent = c.note;
    $('source').textContent = `${c.pages} · ${c.goals.join(', ')}. D = Dossier, P = Prüfungsantworten; PDF-Seiten.`;
    $('external-links').innerHTML = c.links.map(id => `<a href="${escape(sources[id].url)}" target="_blank" rel="noopener noreferrer">${escape(sources[id].title)} ↗</a>`).join('');
    $('question-figure').hidden = !c.image;
    if (c.image) {
      $('question-image').src = `assets/${c.image}`;
      $('question-image').alt = { 'paarstatue.jpg':'Paarstatue: Mann und Frau stehen nebeneinander.', 'grabmalerei.jpg':'Grabmalerei: grosse Figur bei der Vogeljagd im Papyrusdickicht.', 'totengericht.jpg':'Totengericht: Heranführen, Herzwaage und Vorführen vor Osiris; mit handschriftlichen Notizen aus der Vorlage.' }[c.image];
      $('image-caption').textContent = c.image === 'totengericht.jpg' ? 'Ausschnitt aus D 26. Handschriftliche Zuordnungen sind teilweise fehlerhaft; siehe Modellantwort.' : `Bildausschnitt aus dem Dossier · ${c.pages.split(';')[0]}`;
    } else $('question-image').removeAttribute('src');
    const state = progress[c.id] === 'known' ? ' · Gewusst' : progress[c.id] === 'again' ? ' · Noch üben' : '';
    $('position').textContent = `${index + 1} / ${total}${state}`;
    $('prev').disabled = index === 0; $('next').disabled = index === total - 1;
    setFlip(false);
  }
  function refresh() {
    selection = filtered();
    for (const b of $('topic-list').children) { const active = b.dataset.topic === topic; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); }
    updateProgress(); render();
  }
  function step(delta) { const next = index + delta; if (next >= 0 && next < selection.length) { index = next; render(); $('announcement').textContent = selection[index].question; } }
  function rate(value) {
    if (!flipped || !selection.length) return;
    const oldId = selection[index].id, oldIndex = index;
    progress[oldId] = value; save(); selection = filtered();
    const retainedIndex = selection.findIndex(c => c.id === oldId);
    index = retainedIndex >= 0 ? (retainedIndex + 1) % selection.length : Math.min(oldIndex, selection.length - 1);
    updateProgress(); render();
    $('announcement').textContent = `${value === 'known' ? 'Als gewusst gespeichert.' : 'Für weitere Übung gespeichert.'} ${selection.length ? selection[index].question : 'Der ausgewählte Stapel ist leer.'}`;
    (selection.length ? $('flip') : $('clear-filters')).focus({preventScroll:true});
  }
  function resetFilters() { topic = 'all'; $('search').value = ''; $('mode').value = 'all'; $('goal-filter').value = 'all'; index = 0; }
  function switchView(showGoals) {
    $('study-view').hidden = showGoals; $('goals-view').hidden = !showGoals;
    $('study-tab').classList.toggle('active', !showGoals); $('study-tab').setAttribute('aria-pressed', String(!showGoals));
    $('goals-tab').classList.toggle('active', showGoals); $('goals-tab').setAttribute('aria-pressed', String(showGoals));
    if (!showGoals) requestAnimationFrame(resizeCard);
    window.scrollTo({top:0, behavior:'instant'});
  }
  $('flip').addEventListener('click', () => setFlip(!flipped));
  $('filters-toggle').addEventListener('click', () => {
    const expanded = $('filters').classList.toggle('expanded');
    $('filters-toggle').setAttribute('aria-expanded', String(expanded));
    $('filters-toggle').innerHTML = `Auswahl & Lernstand <span aria-hidden="true">${expanded ? '−' : '＋'}</span>`;
  });
  $('card').addEventListener('click', e => { if (e.target.closest('a') || window.getSelection()?.toString()) return; setFlip(!flipped); });
  $('prev').addEventListener('click', () => step(-1)); $('next').addEventListener('click', () => step(1));
  $('again').addEventListener('click', () => rate('again')); $('known').addEventListener('click', () => rate('known'));
  for (const id of ['search', 'mode', 'goal-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { index = 0; refresh(); });
  $('clear-filters').addEventListener('click', () => { resetFilters(); refresh(); });
  $('shuffle').addEventListener('click', () => {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i],order[j]] = [order[j],order[i]]; }
    index = 0; refresh(); $('announcement').textContent = 'Karten gemischt.';
  });
  $('reset').addEventListener('click', () => { $('reset-confirm').hidden = false; $('reset-no').focus(); });
  $('reset-no').addEventListener('click', () => { $('reset-confirm').hidden = true; $('reset').focus(); });
  $('reset-yes').addEventListener('click', () => { progress = {}; save(); $('reset-confirm').hidden = true; index = 0; refresh(); $('reset').focus(); });
  $('study-tab').addEventListener('click', () => switchView(false)); $('goals-tab').addEventListener('click', () => switchView(true));
  document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); switchView(false); });
  document.addEventListener('keydown', e => {
    if ($('study-view').hidden || !selection.length || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); setFlip(!flipped); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === '1') rate('again'); if (e.key === '2') rate('known');
  });
  $('question-image').addEventListener('load', resizeCard);
  new ResizeObserver(() => { if (!$('study-view').hidden && selection.length) resizeCard(); }).observe($('study'));
  refresh();
})();
