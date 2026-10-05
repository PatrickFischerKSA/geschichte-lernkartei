/* Optional browser speech recognition. No recordings or transcripts are stored by this app. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let active = null, available = false, ending = false, card = null, timer = null;
  let segments = [], prefix = '', alternativesIndex = -1;
  function invalidate() { $('oral-result').hidden = true; }
  function clearPending() { clearTimeout(timer); timer = null; }
  function transcript() { $('oral-text').value = [prefix, ...segments].filter(Boolean).join(' '); invalidate(); }
  function uncertain() { if (!$('oral-interim').hidden) $('oral-interim').textContent = 'Nicht bestätigt – bitte prüfen oder erneut sprechen: ' + $('oral-interim').textContent.replace(/^Vorläufig: /, ''); }
  function clearAlternatives() { $('oral-alternatives').hidden = true; $('oral-choice').replaceChildren(); }
  const supported = !!Recognition && window.isSecureContext;
  const ready = supported ? 'Sprich Hochdeutsch möglichst deutlich. Du kannst den erkannten Text korrigieren.' : 'Spracherkennung ist in diesem Browser nicht verfügbar. Du kannst deine Antwort eintippen oder laut für dich beantworten.';
  function controls() {
    $('oral-start').disabled = !supported || !available || !!active;
    $('oral-stop').disabled = !active || ending;
    $('oral-text').readOnly = !!active;
    $('oral-clear').disabled = !!active;
    $('oral-language').disabled = !!active;
    $('oral-choice').disabled = !!active;
    $('oral-check').disabled = !!active || !available || !$('oral-text').value.trim();
    $('oral-start').textContent = $('oral-text').value.trim() ? 'Antwort weitersprechen' : 'Mündlich antworten';
  }
  function abort() {
    clearPending(); uncertain();
    const old = active; active = null; ending = false;
    if (old) { old.abort(); $('oral-status').textContent = 'Mikrofon aus. Vergleiche deinen Text mit der Modellantwort.'; }
    controls();
  }
  $('oral-start').addEventListener('click', () => {
    if (!supported || !available || active) return;
    window.QuestionReader.stop();
    const r = new Recognition(); active = r; ending = false;
    prefix = $('oral-text').value.trim(); segments = []; clearAlternatives(); invalidate(); $('oral-interim').hidden = true;
    r.lang = $('oral-language').value; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    $('oral-status').textContent = 'Mikrofon wird angefragt …'; controls();
    r.onstart = () => { if (active === r) $('oral-status').textContent = 'Mikrofon aktiv – sprich deine Antwort. Danach «Aufnahme beenden» wählen.'; };
    r.onresult = event => {
      if (active !== r) return;
      const interim = [];
      for (let i=0;i<event.results.length;i++) {
        const result = event.results[i];
        if (result.isFinal === false) { interim.push(result[0].transcript); continue; }
        segments[i] = result[0].transcript;
        if (result.length > 1) {
          alternativesIndex = i;
          $('oral-choice').replaceChildren();
          for (let j=0;j<result.length;j++) {
            const option = document.createElement('option'); option.value=result[j].transcript; option.textContent=result[j].transcript; $('oral-choice').append(option);
          }
          $('oral-alternatives').hidden = false;
        }
      }
      transcript();
      $('oral-interim').hidden = !interim.length;
      $('oral-interim').textContent = 'Vorläufig: ' + interim.join(' ');
    };

    r.onerror = event => {
      if (active !== r) return;
      clearPending(); uncertain(); active = null; ending = false; r.abort(); controls();
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
      clearPending(); uncertain(); active = null; ending = false; controls();
      $('oral-status').textContent = $('oral-text').value.trim() ? 'Mikrofon aus. Prüfe den erkannten Text, decke die Modellantwort auf und vergleiche selbst.' : 'Keine Antwort erkannt. Versuche es erneut oder tippe deine Antwort ein.';
    };
    try { r.start(); } catch { r.onerror({error:'not-allowed'}); }
  });
  $('oral-stop').addEventListener('click', () => {
    if (!active) return;
    ending = true; controls(); $('oral-status').textContent = 'Aufnahme wird beendet …';
    const stopping = active;
    timer = setTimeout(() => { if (active === stopping) { abort(); $('oral-status').textContent = 'Mikrofon beendet. Prüfe den Text; unbestätigte Wörter wurden nicht übernommen.'; } }, 5000);
    active.stop();
  });
  $('oral-choice').addEventListener('change', () => { segments[alternativesIndex] = $('oral-choice').value; transcript(); controls(); });
  $('oral-text').addEventListener('input', () => { invalidate(); clearAlternatives(); controls(); });
  $('oral-check').addEventListener('click', () => {
    const result = $('oral-result'); result.replaceChildren(); result.hidden = false;
    const line = text => { const p = document.createElement('p'); p.textContent = text; result.append(p); };
    if (!card || card.status === 'offen') { line('Die Quelle fehlt. Für diese Karte ist kein verlässlicher Abgleich möglich.'); return; }
    const match = window.AnswerCheck.compare($('oral-text').value, window.ANSWER_CONCEPTS[card.id] || []);
    line('Begriffe erkannt: ' + (match.found.join(', ') || 'Noch keine der hinterlegten Formulierungen.'));
    line('Noch selbst prüfen: ' + (match.missing.join(', ') || 'Alle hinterlegten Begriffe wurden erwähnt. Prüfe trotzdem ihre Zusammenhänge.'));
    if (match.caution) line('Verneinung oder Einschränkung erkannt: Die Bedeutung muss manuell geprüft werden.');
    line('Dieser Abgleich erkennt Begriffe und hinterlegte Synonyme, keine vollständige Bedeutung. Auch richtige Umschreibungen können fehlen; falsche Zuordnungen oder Zahlen werden nicht zuverlässig erkannt. Vergleiche die Modellantwort.');
  });
  $('oral-clear').addEventListener('click', () => { $('oral-text').value = ''; $('oral-interim').hidden = true; clearAlternatives(); invalidate(); $('oral-status').textContent = ready; controls(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) abort(); });
  window.addEventListener('pagehide', abort);
  window.OralAnswer = {
    stop: abort,
    reset() { abort(); card = null; clearAlternatives(); invalidate(); $('oral-interim').hidden = true; available = false; $('oral-text').value = ''; $('oral-status').textContent = ready; controls(); },
    setAvailable(value, currentCard) { available = value; card = currentCard; controls(); }
  };
  window.OralAnswer.reset();
})();
