const test=require('node:test'), assert=require('node:assert/strict'), L=require('../learning.js');
const now=new Date(2026,9,1,12).getTime(), day=86400000;
test('Existing ratings become due without losing progress; invalid state is discarded',()=>{
 const s=L.restore({xp:-4,rounds:'no',records:{a:{level:77,due:0}}},{a:'known',b:'again'},['a','b','c']);
 assert.equal(s.xp,0); assert.equal(s.records.a.due,0); assert.equal(s.records.b.level,0); assert.equal(s.records.c,undefined);
 const cs=['a','b','c','d'].map(id=>({id,status:id==='d'?'offen':'abgeglichen'}));
 assert.deepEqual(L.dueCards(cs,{a:'known',b:'again',d:'again'},s,now).map(c=>c.id),['b','a']);
});
test('Intervals advance only when due; early practice does not inflate the interval',()=>{
 const s=L.restore(null,{},['a']);let clock=now;
 for(const interval of [1,3,7,14,30,30]){
  const r=L.review(s,'a',true,clock);assert.equal(r.due,clock+interval*day);
  assert.equal(L.review(s,'a',true,clock+100).due,r.due);clock=r.due;
 }
 assert.equal(L.review(s,'a',false,clock).level,0);
 assert.equal(L.review(s,'a',true,clock).due,clock+day);
});
test('Missed cards return after three others, score once, and all mastered ends round',()=>{
 const s=L.restore(null,{},[]),r=L.createRound(['a','b','c','d'],'game');
 L.answerRound(r,s,false,now);assert.deepEqual(r.queue,['b','c','d','a']);assert.equal(r.streak,0);
 L.answerRound(r,s,true,now);L.answerRound(r,s,true,now);
 assert.equal(L.answerRound(r,s,true,now).earned,15);
 const result=L.answerRound(r,s,true,now);assert.equal(result.earned,5);assert.equal(result.complete,true);
 assert.equal(r.score,40);assert.equal(r.turns,5);assert.equal(s.rounds,1);
 assert.equal(L.answerRound(r,s,true,now),null);assert.equal(s.rounds,1);
 const repeated=L.createRound(['a'],'game');assert.equal(L.answerRound(repeated,s,true,now).earned,0);
 const tomorrow=L.createRound(['a'],'game');assert.equal(L.answerRound(tomorrow,s,true,now+day).earned,10);
});
test('Single-card retry remains playable; round is bounded to ten distinct cards',()=>{
 const s=L.restore(null,{},[]),r=L.createRound(['a','a'],'review');
 L.answerRound(r,s,false,now);assert.deepEqual(r.queue,['a']);
 assert.equal(L.answerRound(r,s,true,now).complete,true);
 assert.equal(L.createRound(Array.from({length:30},(_,i)=>String(i)),'game').ids.length,10);
});
