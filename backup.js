/* Versioned subject-specific backups; never stores spoken answers or microphone data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let config, db = null, history = [], latest = null, queue = Promise.resolve(), restoring = false;
  let messageRevision = 0;
  const message = text => { messageRevision++; $('backup-status').textContent = text; };
  const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const localRead = key => { try { return localStorage.getItem(key); } catch { return null; } };
  function validate(value) {
    if (!plain(value) || value.format !== 'lernstand-backup' || value.version !== 1 || value.subject !== config.subject || !Number.isFinite(Date.parse(value.savedAt))) throw Error('Diese Datei gehört nicht zu dieser Lernlandschaft oder hat ein unbekanntes Format.');
    const s = value.state;
    if (!plain(s) || !plain(s.progress) || !plain(s.training) || !plain(s.training.records) || !['basis','vertieft','profi'].includes(s.level)) throw Error('Die Sicherung enthält ungültige Lernstanddaten.');
    for (const [id, rating] of Object.entries(s.progress)) if (!config.ids.includes(id) || !['known','again'].includes(rating)) throw Error('Ungültige Karte oder Bewertung in der Sicherung.');
    for (const n of ['xp','rounds']) if (!Number.isSafeInteger(s.training[n]) || s.training[n]<0) throw Error('Ungültiger Punktestand.');
    for (const [id,r] of Object.entries(s.training.records)) if (!config.ids.includes(id) || !plain(r) || !Number.isInteger(r.level) || r.level<0 || r.level>5 || !Number.isFinite(r.due) || r.due<0 || r.due>8640000000000000 || typeof r.rewardDay!=='string' || r.rewardDay.length>40) throw Error('Ungültige Wiederholungstermine.');
    return JSON.parse(JSON.stringify(value));
  }
  function envelope(state) { return {format:'lernstand-backup', version:1, subject:config.subject, savedAt:new Date(Math.max(Date.now(),Date.parse(latest?.savedAt||'')+1||0)).toISOString(), state}; }
  function parse(raw) { try { return validate(JSON.parse(raw)); } catch { return null; } }
  function readHistory(raw) { try { const items=JSON.parse(raw); return Array.isArray(items)?items.map(x=>{try{return validate(x)}catch{return null}}).filter(Boolean).slice(0,20):[]; } catch { return []; } }
  async function openDatabase() {
    if (!window.indexedDB) return;
    await new Promise(resolve => {
      let finished=false;
      const timeout=setTimeout(()=>{finished=true;resolve();},2000);
      let request;
      try { request=indexedDB.open('lernstand-backups-v1',1); } catch { clearTimeout(timeout);resolve();return; }
      request.onupgradeneeded=()=>request.result.createObjectStore('subjects');
      request.onsuccess=()=>{clearTimeout(timeout);if(finished){request.result.close();return;}db=request.result; db.onversionchange=()=>{db.close();db=null;};resolve();};
      request.onerror=request.onblocked=()=>{clearTimeout(timeout);finished=true;resolve();};
    });
  }
  function databaseRead() {
    return new Promise(resolve=>{
      if(!db){resolve([]);return;}
      const timeout=setTimeout(()=>resolve([]),2000);
      try { const req=db.transaction('subjects').objectStore('subjects').get(config.subject);req.onsuccess=()=>{clearTimeout(timeout);resolve(readHistory(JSON.stringify(req.result||[])));};req.onerror=()=>{clearTimeout(timeout);resolve([]);}; }catch{clearTimeout(timeout);resolve([]);}
    });
  }
  function databaseWrite(items) {
    return new Promise(resolve=>{
      if(!db){resolve(false);return;}
      const timeout=setTimeout(()=>resolve(false),2000);
      try { const tx=db.transaction('subjects','readwrite');tx.objectStore('subjects').put(items,config.subject);tx.oncomplete=()=>{clearTimeout(timeout);resolve(true);};tx.onerror=tx.onabort=()=>{clearTimeout(timeout);resolve(false);}; }catch{clearTimeout(timeout);resolve(false);}
    });
  }
  function refreshHistory() {
    const select=$('backup-history');select.replaceChildren();
    history.forEach((item,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${new Date(item.savedAt).toLocaleString('de-CH')} · ${Object.keys(item.state.progress).length} bewertet · ${item.state.training.xp} XP${i===0?' (aktuell)':''}`;select.append(option);});
    $('backup-restore').disabled=history.length<2;
    select.value=history.length>1?'1':'0';
  }
  function save(state) {
    let item=validate(envelope(state));
    const unchanged=latest && JSON.stringify(latest.state)===JSON.stringify(item.state);
    if(unchanged)item=latest;
    latest=item;
    if(!unchanged)history=[item,...history].slice(0,20);
    let localOK=false;
    try { localStorage.setItem(config.snapshot,JSON.stringify(item));localOK=true;localStorage.setItem(config.history,JSON.stringify(history)); }catch{}
    // Keep the original keys compatible with older app versions.
    try { localStorage.setItem(config.keys.progress,JSON.stringify(state.progress));localStorage.setItem(config.keys.training,JSON.stringify(state.training));localStorage.setItem(config.keys.level,state.level); }catch{}
    refreshHistory();
    const items=JSON.parse(JSON.stringify(history));
    message('Lernstand wird gesichert …');
    const statusRevision = messageRevision;
    queue=queue.then(async()=>{
      const databaseOK=await databaseWrite(items);
      if(latest!==item || messageRevision!==statusRevision)return;
      message(localOK&&databaseOK ? 'Automatisch gespeichert – mit zweiter lokaler Sicherung.' : localOK||databaseOK ? 'Lokal gespeichert. Für eine zusätzliche Sicherung bitte Backup herunterladen.' : 'Speichern im Browser nicht möglich. Jetzt eine Backup-Datei herunterladen, bevor du die Seite schliesst.');
    }).catch(()=>message('Sicherung unvollständig. Bitte eine Backup-Datei herunterladen.'));
    return queue;
  }
  async function apply(item) {
    if(restoring)return;
    if(!window.confirm('Diesen Lernstand übernehmen? Der aktuelle Stand wird durch die ausgewählte Sicherung ersetzt.'))return;
    restoring=true;
    const before=latest, beforeHistory=[...history];
    await save(item.state);
    // Require at least one durable copy before reloading away from current memory.
    const local=parse(localRead(config.snapshot));
    const stored=await databaseRead();
    if(JSON.stringify(local?.state)!==JSON.stringify(item.state)&&JSON.stringify(stored[0]?.state)!==JSON.stringify(item.state)) {latest=before;history=beforeHistory;refreshHistory();restoring=false;message('Wiederherstellung nicht gespeichert. Der bisher angezeigte Lernstand bleibt erhalten.');return;}
    location.reload();
  }
  window.LearningBackup={
    async init(options) {
      config={...options,snapshot:`${options.subject}:snapshot:v1`,history:`${options.subject}:backups:v1`};
      history=readHistory(localRead(config.history));
      let current=parse(localRead(config.snapshot));
      await openDatabase();const other=await databaseRead();
      // Use the atomic snapshot; fall back to another copy only when it is missing or invalid.
      current=[current,...other,...history].filter(Boolean).sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt))[0]||null;
      if(current) {
        latest=current;
        const all=[current,...history,...other].sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt));const seen=new Set();history=all.filter(x=>{const k=JSON.stringify(x);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,20);
        try {localStorage.setItem(config.snapshot,JSON.stringify(current));}catch{}
      }
      refreshHistory();
      message(current?'Gespeicherten Lernstand geladen.':'Bisheriger Lernstand wird beim Start übernommen.');
      $('backup-export').addEventListener('click',()=>{
        if(!latest)return;
        const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=`${config.subject}-lernstand-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        message('Backup-Download gestartet. Bewahre die Datei ausserhalb des Browsers auf, zum Beispiel in deinem Cloud-Ordner.');
      });
      $('backup-import').addEventListener('change',async event=>{
        const file=event.target.files[0];if(!file)return;
        try {if(file.size>2000000)throw Error('Die Datei ist zu gross.');const item=validate(JSON.parse(await file.text()));await apply(item);}catch(error){message(error instanceof SyntaxError?'Diese Datei ist keine gültige JSON-Sicherung.':error.message);}finally{event.target.value='';}
      });
      $('backup-restore').addEventListener('click',()=>{const item=history[Number($('backup-history').value)];if(item)void apply(item);});
      $('backup-persist').addEventListener('click',async()=>{
        try {const granted=await navigator.storage?.persist?.();$('backup-persistence').textContent=granted?'Dauerhafter Browserspeicher bestätigt. Manuelles Löschen der Browserdaten entfernt auch diese Sicherungen.':'Der Browser hat dauerhaften Speicher nicht zugesichert. Bitte regelmässig eine Backup-Datei herunterladen.';}catch{$('backup-persistence').textContent='Dauerhafter Speicher nicht verfügbar. Bitte eine Backup-Datei herunterladen.';}
      });
      try{if(await navigator.storage?.persisted?.())$('backup-persistence').textContent='Dauerhafter Browserspeicher ist bereits aktiviert.';}catch{}
      return current?.state||null;
    },save,
    async flush(){await queue;}
  };
})();
