(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Learning = api;
})(typeof window === 'object' ? window : globalThis, () => {
  'use strict';
  const DAY = 86400000, INTERVALS = [1, 3, 7, 14, 30];
  function restore(raw, progress, ids) {
    const state = { xp: 0, rounds: 0, records: {} };
    if (raw && typeof raw === 'object') {
      for (const key of ['xp','rounds']) if (Number.isSafeInteger(raw[key]) && raw[key] >= 0) state[key] = raw[key];
    }
    for (const id of ids) {
      const r = raw?.records?.[id];
      if (r && Number.isInteger(r.level) && r.level >= 0 && r.level <= 5 && Number.isFinite(r.due) && r.due >= 0) {
        state.records[id] = {level:r.level, due:r.due, rewardDay:typeof r.rewardDay === 'string' ? r.rewardDay : ''};
      } else if (progress[id]) state.records[id] = {level:0, due:0, rewardDay:''};
    }
    return state;
  }
  function dueCards(cards, progress, state, now = Date.now()) {
    return cards.filter(c => c.status !== 'offen' && (progress[c.id] === 'again' || (progress[c.id] && (state.records[c.id]?.due ?? 0) <= now)))
      .sort((a,b) => (progress[a.id] === 'again' ? 0 : 1) - (progress[b.id] === 'again' ? 0 : 1) || (state.records[a.id]?.due ?? 0) - (state.records[b.id]?.due ?? 0));
  }
  function createRound(ids, mode) {
    const unique = [...new Set(ids)].slice(0, 10);
    return {mode, queue:[...unique], ids:unique, mastered:[], attempts:{}, score:0, streak:0, best:0, turns:0};
  }
  function dayKey(now) { const d=new Date(now); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  function review(state, id, known, now = Date.now()) {
    const previous = state.records[id] || {level:0, due:0, rewardDay:''};
    if (known && previous.level > 0 && previous.due > now) return previous;
    const level = known ? Math.min(5, previous.level+1) : 0;
    state.records[id] = {...previous, level, due:known ? now + INTERVALS[level-1]*DAY : now};
    return state.records[id];
  }
  function answerRound(round, state, known, now = Date.now()) {
    if (!round.queue.length) return null;
    const id = round.queue.shift();
    round.turns++; round.attempts[id] = (round.attempts[id] || 0)+1;
    review(state, id, known, now);
    let earned = 0;
    if (known) {
      round.mastered.push(id); round.streak++; round.best = Math.max(round.best, round.streak);
      if (state.records[id].rewardDay !== dayKey(now)) {
        earned = (round.attempts[id] === 1 ? 10 : 5) + (round.streak % 3 === 0 ? 5 : 0);
        state.records[id].rewardDay = dayKey(now); state.xp += earned; round.score += earned;
      }
    } else {
      round.streak = 0;
      round.queue.splice(Math.min(3, round.queue.length), 0, id);
    }
    const complete = round.queue.length === 0;
    if (complete) state.rounds++;
    return {id, earned, complete, known};
  }
  return {restore, dueCards, createRound, review, answerRound, INTERVALS};
});
