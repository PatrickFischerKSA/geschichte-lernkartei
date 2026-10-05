/* Conservative local concept matching: no fuzzy correction or automatic grading. */
(function(root){
 const normalize=s=>s.toLowerCase().replace(/ß/g,'ss').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9,.*\s]/g,' ').replace(/\s+/g,' ').trim();
 function has(text,term){
  const pattern=normalize(term).split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[a-z]*');
  return new RegExp('(?:^|[^a-z0-9])'+pattern+'(?=$|[^a-z0-9])').test(text);
 }
 function compare(answer,concepts){
  const text=normalize(answer);
  return {
   found:concepts.filter(c=>c.terms.some(t=>has(text,t))).map(c=>c.label),
   missing:concepts.filter(c=>!c.terms.some(t=>has(text,t))).map(c=>c.label),
   caution:/\b(nicht|kein[a-z]*|nie|ohne|statt|weder|doch|aber)\b/.test(text)
  };
 }
 const api={compare,normalize}; if(typeof module==='object')module.exports=api;else root.AnswerCheck=api;
})(typeof window==='undefined'?globalThis:window);
