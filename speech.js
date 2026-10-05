/* Reads questions only; browser/device voices supply the audio. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = supported ? window.speechSynthesis : null;
  let question = '', enabled = false, current = null, heard = false;
  const ready = 'Frage vorlesen oder den Vorlesemodus starten. Die Antwort bleibt verdeckt.';
  function controls() {
    $('audio-toggle').disabled = !supported;
    $('audio-toggle').setAttribute('aria-pressed', String(enabled));
    $('audio-toggle').textContent = enabled ? 'Vorlesemodus ausschalten' : 'Vorlesemodus starten';
    $('audio-read').disabled = !supported || !question;
    $('audio-read').textContent = heard ? 'Noch einmal hören' : 'Frage vorlesen';
    $('audio-stop').disabled = !current;
    $('audio-rate').disabled = !supported;
  }
  function stop() {
    current = null;
    if (synth) synth.cancel();
    $('audio-status').textContent = !supported ? 'Dieser Browser unterstützt das Vorlesen nicht. Die Lernkarten bleiben vollständig nutzbar.' : enabled ? 'Vorlesemodus aktiv: Die nächste Frage wird automatisch vorgelesen.' : ready;
    controls();
  }
  function read() {
    if (!supported || !question || document.hidden) return;
    window.OralAnswer?.stop();
    stop();
    const utterance = new SpeechSynthesisUtterance(question);
    const voices = synth.getVoices();
    const voice = voices.find(v => /^de[-_]CH$/i.test(v.lang)) || voices.find(v => /^de(?:[-_]|$)/i.test(v.lang) && v.localService) || voices.find(v => /^de(?:[-_]|$)/i.test(v.lang));
    utterance.lang = voice?.lang || 'de-DE';
    if (voice) utterance.voice = voice;
    utterance.rate = Number($('audio-rate').value);
    current = utterance;
    heard = true;
    $('audio-status').textContent = 'Frage wird vorgelesen …';
    utterance.onend = () => { if (current === utterance) { current = null; $('audio-status').textContent = 'Mit «Noch einmal hören» kannst du die Frage wiederholen. Danach selbst antworten und die Karte wenden.'; controls(); } };
    utterance.onerror = () => {
      if (current !== utterance) return;
      current = null; enabled = false; controls();
      $('audio-status').textContent = 'Vorlesen nicht möglich. Prüfe die Sprachausgabe deines Geräts und klicke erneut auf die Vorleseschaltfläche.';
    };
    controls();
    try { synth.speak(utterance); } catch { utterance.onerror(); }
  }
  $('audio-toggle').addEventListener('click', () => {
    enabled = !enabled; stop();
    if (enabled) read();
  });
  $('audio-read').addEventListener('click', read);
  $('audio-stop').addEventListener('click', stop);
  $('audio-rate').addEventListener('change', () => { if (current) read(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.QuestionReader = {
    setQuestion(text) { stop(); question = text || ''; heard = false; controls(); if (enabled) read(); },
    stop
  };
  if (new URLSearchParams(location.search).get('vorlesen') === '1') {
    $('audio-title').textContent = 'Hörvariante: Fragen vorlesen lassen';
  }
  controls();
  $('audio-status').textContent = supported ? ready : 'Dieser Browser unterstützt das Vorlesen nicht. Die Lernkarten bleiben vollständig nutzbar.';
  // Some browsers load their voice list asynchronously; read() queries it anew.
  if (synth) synth.getVoices();
})();
