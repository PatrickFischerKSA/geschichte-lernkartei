/* No network calls: content and learning progress stay in this browser. */
(() => {
  'use strict';
  const { cards, goals, sources } = window.LEARNING_DATA;
  const $ = id => document.getElementById(id);
  const KEY = 'geschichte-zum-wenden:v1';
  const GAME_KEY = 'geschichte-zum-wenden:training:v1';
  const LEVEL_KEY = 'geschichte-zum-wenden:level:v1';
  const levels = {
    basis: {rank:0, label:'Basis', description:'Begriffe, Fakten und grundlegende Abläufe sicher wiedergeben.'},
    vertieft: {rank:1, label:'Vertieft', description:'Zusammenhänge erklären und Ursachen verstehen. Enthält auch die Basis-Karten.'},
    profi: {rank:2, label:'Profi', description:'Quellen kritisch prüfen, vergleichen und Wissen anwenden. Enthält alle Karten, auch Basis und Vertieft.'}
  };
  let level = 'basis';
  try { const saved = localStorage.getItem(LEVEL_KEY); if (Object.hasOwn(levels, saved)) level = saved; } catch {}
  const inLevel = c => levels[c.level].rank <= levels[level].rank;
  const L = window.Learning;
  let playMode = 'free', round = null, training;
  const statuses = { abgeglichen: 'Dossierabgleich', praezisiert: 'Präzisiert / korrigiert', ergaenzt: 'Ergänzend geprüft', offen: 'Quelle fehlt' };
  let progress = {}, topic = 'all', order = cards.map(c => c.id), selection = [], index = 0, flipped = false;
  const validIds = new Set(order);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') for (const [id, value] of Object.entries(saved)) {
      if (validIds.has(id) && ['known', 'again'].includes(value)) progress[id] = value;
    }
  } catch { $('storage-warning').hidden = false; }
  try { training = L.restore(JSON.parse(localStorage.getItem(GAME_KEY) || 'null'), progress, validIds); }
  catch { training = L.restore(null, progress, validIds); }
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
    item.querySelector('button').addEventListener('click', () => { setPlayMode('free'); resetFilters(); $('goal-filter').value = g.id; refresh(); switchView(false); $('flip').focus(); });
    $('goal-cards').append(item);
  }
  $('status-summary').innerHTML = Object.entries(statuses).map(([s, label]) => `<span>${cards.filter(c => c.status === s).length} ${label}</span>`).join('');
  $('bibliography').innerHTML = Object.values(sources).map(s => `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></li>`).join('');
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); localStorage.setItem(GAME_KEY, JSON.stringify(training)); } catch { $('storage-warning').hidden = false; } }
  function updateProgress() {
    const n = Object.values(progress).filter(v => v === 'known').length;
    $('progress').value = n; $('progress').max = cards.length; $('progress-text').textContent = `${n} / ${cards.length}`;
  }
  function filtered() {
    const search = norm($('search').value.trim()), mode = $('mode').value, goal = $('goal-filter').value;
    const byId = new Map(cards.map(c => [c.id, c]));
    return order.map(id => byId.get(id)).filter(c =>
      inLevel(c) && (topic === 'all' || c.topic === topic) &&
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
    updateGameUI();
    if (playMode !== 'free' && (!round || !round.queue.length)) {
      $('empty').hidden = true; $('card-region').hidden = true;
      return;
    }
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
    $('card-level').textContent = levels[c.level].label;
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
    document.querySelector('.card-nav').hidden = !!round;
    document.querySelector('.keyboard').textContent = round ? 'LEERTASTE wenden · 1 noch üben · 2 gewusst' : 'LEERTASTE wenden · ← → blättern · 1 noch üben · 2 gewusst';
    setFlip(false);
  }
  function refresh() {
    selection = round?.queue.length ? round.queue.map(id => cards.find(c => c.id === id)) : filtered();
    if (round) index = 0;
    for (const b of $('topic-list').children) { const active = b.dataset.topic === topic; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); }
    updateProgress(); render();
  }
  function step(delta) { if (playMode !== 'free') return; const next = index + delta; if (next >= 0 && next < selection.length) { index = next; render(); $('announcement').textContent = selection[index].question; } }
  function rate(value) {
    if (!flipped || !selection.length) return;
    if (playMode !== 'free') { rateRound(value); return; }
    const oldId = selection[index].id, oldIndex = index;
    if (selection[index].status !== 'offen') L.review(training, oldId, value === 'known');
    progress[oldId] = value; save(); selection = filtered();
    const retainedIndex = selection.findIndex(c => c.id === oldId);
    index = retainedIndex >= 0 ? (retainedIndex + 1) % selection.length : Math.min(oldIndex, selection.length - 1);
    updateProgress(); render();
    $('announcement').textContent = `${value === 'known' ? 'Als gewusst gespeichert.' : 'Für weitere Übung gespeichert.'} ${selection.length ? selection[index].question : 'Der ausgewählte Stapel ist leer.'}`;
    (selection.length ? $('flip') : $('clear-filters')).focus({preventScroll:true});
  }
  function candidates() {
    const pool = filtered().filter(c => c.status !== 'offen');
    return playMode === 'review' ? L.dueCards(pool, progress, training) : pool;
  }
  function updateGameUI() {
    const active = !!round?.queue.length, complete = !!round && !active;
    $('due-count').textContent = L.dueCards(cards.filter(inLevel), progress, training).length;
    document.querySelectorAll('[data-level]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.level === level)); b.disabled = active;
    });
    $('level-description').textContent = `${levels[level].description} ${cards.filter(inLevel).length} Karten. Auswahl gilt für alle Lernmodi.`;
    for (const b of $('topic-list').children) b.lastElementChild.textContent = cards.filter(c => inLevel(c) && (b.dataset.topic === 'all' || c.topic === b.dataset.topic)).length;
    document.querySelectorAll('[data-play]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.play === playMode)));
    $('round-setup').hidden = playMode === 'free' || !!round;
    $('round-hud').hidden = !active; $('round-result').hidden = !complete;
    document.querySelector('.deck-bar').hidden = playMode !== 'free';
    for (const el of $('filters').querySelectorAll('button,input,select')) el.disabled = active;
    if (playMode !== 'free' && !round) {
      const pool = candidates();
      $('round-title').textContent = playMode === 'review' ? 'Festigen, was noch nicht sitzt.' : 'Zehn Karten. Eine neue Etappe.';
      $('round-description').textContent = playMode === 'review' ? 'Unsichere und fällige Karten kommen zuerst. Wende jede Karte und vergleiche deine Antwort, bis du den Stapel geschafft hast.' : 'Sammle Punkte, baue eine Serie auf und meistere bis zu zehn zufällig gewählte Karten. Unsichere Antworten kommen in derselben Runde zurück.';
      $('total-xp').textContent = training.xp; $('total-rounds').textContent = training.rounds;
      $('start-round').disabled = pool.length === 0;
      $('start-round').textContent = playMode === 'review' ? 'Repetition starten →' : 'Spielrunde starten →';
      let hint = pool.length ? `${pool.length} passende Karten · ${Math.min(10,pool.length)} in der nächsten Runde. Bewertung durch Selbsteinschätzung.` : 'Keine passenden Karten. Passe deine Filter an oder lerne zuerst einige Karten im freien Lernen.';
      if (!pool.length && playMode === 'review') {
        const nextDue = filtered().filter(c => c.status !== 'offen' && progress[c.id]).map(c => training.records[c.id]?.due).filter(t => t > Date.now()).sort((a,b)=>a-b)[0];
        if (nextDue) hint = `Im gewählten Stapel ist alles für heute erledigt. Nächste Wiederholung ab ${new Date(nextDue).toLocaleString('de-CH', {dateStyle:'medium',timeStyle:'short'})}.`;
      }
      $('round-availability').textContent = hint;
    }
    if (active) {
      $('round-mode-label').textContent = round.mode === 'review' ? 'REPETITION' : 'SPIELRUNDE';
      $('round-counter').textContent = `${round.mastered.length} / ${round.ids.length} geschafft`;
      $('round-score').textContent = `${round.score} XP`; $('round-streak').textContent = `${round.streak} in Folge`;
      $('round-progress').max = round.ids.length; $('round-progress').value = round.mastered.length;
    }
  }
  function setPlayMode(mode) {
    playMode = mode; round = null; flipped = false; index = 0;
    $('round-feedback').hidden = true;
    refresh();
  }
  function startRound() {
    const pool = candidates().map(c => c.id);
    if (playMode === 'game') for (let i=pool.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    if (!pool.length) { refresh(); return; }
    round = L.createRound(pool, playMode);
    $('filters').classList.remove('expanded'); $('filters-toggle').setAttribute('aria-expanded','false');
    $('filters-toggle').innerHTML = 'Auswahl & Lernstand <span aria-hidden="true">＋</span>';
    $('round-feedback').hidden = false; $('round-feedback').textContent = 'Antworte aus dem Gedächtnis. Nach dem Wenden bewertest du dich selbst.';
    refresh(); $('flip').focus({preventScroll:true});
  }
  function rateRound(value) {
    if (!round?.queue.length) return;
    const result = L.answerRound(round, training, value === 'known');
    progress[result.id] = value; flipped = false; save();
    $('round-feedback').hidden = false;
    $('round-feedback').textContent = result.known ? (result.earned ? `+${result.earned} XP · Gut erinnert!` : 'Gut erinnert! Die Punkte für diese Karte hast du heute bereits erhalten.') : 'Noch nicht sicher? Die Karte kommt nach bis zu drei anderen Karten wieder. Deine Serie beginnt neu.';
    if (result.complete) {
      $('result-description').textContent = `${round.ids.length} Karten in ${round.turns} Versuchen wiederholt. Jede davon hast du am Ende als gewusst eingeschätzt.`;
      $('result-metrics').innerHTML = `<span><b>${round.score}</b> XP in dieser Runde</span><span><b>${round.best}</b> beste Serie</span><span><b>${training.xp}</b> XP insgesamt</span>`;
    }
    refresh();
    (result.complete ? $('round-result') : $('flip')).focus({preventScroll:true});
  }
  function setLevel(value) {
    level = value; round = null; index = 0; flipped = false;
    try { localStorage.setItem(LEVEL_KEY, level); } catch { $('storage-warning').hidden = false; }
    $('round-feedback').hidden = true; refresh();
  }
  function resetFilters() { setLevel('profi'); topic = 'all'; $('search').value = ''; $('mode').value = 'all'; $('goal-filter').value = 'all'; index = 0; }
  function switchView(showGoals) {
    $('study-view').hidden = showGoals; $('goals-view').hidden = !showGoals;
    $('study-tab').classList.toggle('active', !showGoals); $('study-tab').setAttribute('aria-pressed', String(!showGoals));
    $('goals-tab').classList.toggle('active', showGoals); $('goals-tab').setAttribute('aria-pressed', String(showGoals));
    if (!showGoals) requestAnimationFrame(resizeCard);
    window.scrollTo({top:0, behavior:'instant'});
  }
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
  $('flip').addEventListener('click', () => setFlip(!flipped));
  document.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => setPlayMode(b.dataset.play)));
  $('start-round').addEventListener('click', startRound);
  $('leave-round').addEventListener('click', () => setPlayMode('free'));
  $('another-round').addEventListener('click', () => setPlayMode(playMode));
  $('result-review').addEventListener('click', () => setPlayMode('review'));
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
  $('reset-yes').addEventListener('click', () => { progress = {}; training = L.restore(null, {}, validIds); round = null; save(); $('reset-confirm').hidden = true; index = 0; refresh(); $('reset').focus(); });
  $('study-tab').addEventListener('click', () => switchView(false)); $('goals-tab').addEventListener('click', () => switchView(true));
  document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); switchView(false); });
  document.addEventListener('keydown', e => {
    if ($('study-view').hidden || $('card-region').hidden || !selection.length || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); setFlip(!flipped); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === '1') rate('again'); if (e.key === '2') rate('known');
  });
  $('question-image').addEventListener('load', resizeCard);
  new ResizeObserver(() => { if (!$('study-view').hidden && selection.length) resizeCard(); }).observe($('study'));
  refresh();
})();
