/* Optional browser speech recognition. No recordings or transcripts are stored by this app. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let active = null, available = false, ending = false;
  const supported = !!Recognition && window.isSecureContext;
  const ready = supported ? 'Sprich Hochdeutsch möglichst deutlich. Du kannst den erkannten Text korrigieren.' : 'Spracherkennung ist in diesem Browser nicht verfügbar. Du kannst deine Antwort eintippen oder laut für dich beantworten.';
  function controls() {
    $('oral-start').disabled = !supported || !available || !!active;
    $('oral-stop').disabled = !active || ending;
    $('oral-text').readOnly = !!active;
    $('oral-clear').disabled = !!active;
  }
  function abort() {
    const old = active; active = null; ending = false;
    if (old) { old.abort(); $('oral-status').textContent = 'Mikrofon aus. Vergleiche deinen Text mit der Modellantwort.'; }
    controls();
  }
  $('oral-start').addEventListener('click', () => {
    if (!supported || !available || active) return;
    window.QuestionReader.stop();
    const r = new Recognition(); active = r; ending = false;
    const prefix = $('oral-text').value.trim();
    r.lang = 'de-DE'; r.continuous = true; r.interimResults = true;
    $('oral-status').textContent = 'Mikrofon wird angefragt …'; controls();
    r.onstart = () => { if (active === r) $('oral-status').textContent = 'Mikrofon aktiv – sprich deine Antwort. Danach «Aufnahme beenden» wählen.'; };
    r.onresult = event => {
      if (active !== r) return;
      const parts = [];
      for (let i=0;i<event.results.length;i++) parts.push(event.results[i][0].transcript);
      $('oral-text').value = [prefix, ...parts].filter(Boolean).join(' ');
    };
    r.onerror = event => {
      if (active !== r) return;
      active = null; ending = false; r.abort(); controls();
      const messages = {
        'not-allowed':'Mikrofonzugriff wurde nicht erlaubt. Erlaube ihn in den Website-Einstellungen oder tippe deine Antwort ein.',
        'service-not-allowed':'Der Browser erlaubt die Spracherkennung nicht. Nutze einen anderen unterstützten Browser oder tippe deine Antwort ein.',
        'audio-capture':'Kein Mikrofon verfügbar. Prüfe dein Mikrofon oder tippe deine Antwort ein.',
        'no-speech':'Keine Sprache erkannt. Versuche es erneut oder tippe deine Antwort ein.',
        'network':'Die Spracherkennung konnte keine Verbindung herstellen. Prüfe deine Internetverbindung oder tippe deine Antwort ein.'
      };
      $('oral-status').textContent = messages[event.error] || 'Spracherkennung beendet. Du kannst es erneut versuchen oder deine Antwort eintippen.';
    };
    r.onend = () => {
      if (active !== r) return;
      active = null; ending = false; controls();
      $('oral-status').textContent = $('oral-text').value.trim() ? 'Mikrofon aus. Prüfe den erkannten Text, decke die Modellantwort auf und vergleiche selbst.' : 'Keine Antwort erkannt. Versuche es erneut oder tippe deine Antwort ein.';
    };
    try { r.start(); } catch { r.onerror({error:'not-allowed'}); }
  });
  $('oral-stop').addEventListener('click', () => {
    if (!active) return;
    ending = true; controls(); $('oral-status').textContent = 'Aufnahme wird beendet …';
    active.stop();
  });
  $('oral-clear').addEventListener('click', () => { $('oral-text').value = ''; $('oral-status').textContent = ready; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) abort(); });
  window.addEventListener('pagehide', abort);
  window.OralAnswer = {
    stop: abort,
    reset() { abort(); available = false; $('oral-text').value = ''; $('oral-status').textContent = ready; controls(); },
    setAvailable(value) { available = value; controls(); }
  };
  window.OralAnswer.reset();
})();
