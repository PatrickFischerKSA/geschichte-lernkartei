const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.sessions=[];
  window.SpeechRecognition=class {
   constructor(){sessions.push(this)}
   start(){this.onstart()}
   stop(){this.onend()}
   abort(){this.aborted=true;this.onend?.()}
  };
 });
 const url=pathToFileURL(path.join(__dirname,'../index.html')).href;
 await page.goto(url);
 assert.equal(await page.evaluate(()=>sessions.length),0);
 await page.locator('#oral-start').click();
 assert.equal(await page.locator('#oral-text').getAttribute('readonly'),'');
 await page.evaluate(()=>sessions[0].onresult({results:[[{transcript:'Der Nil bringt fruchtbaren Schlamm.'}]]}));
 await page.locator('#oral-stop').click();
 assert.equal(await page.locator('#oral-text').inputValue(),'Der Nil bringt fruchtbaren Schlamm.');
 await page.locator('#oral-text').fill('Der Nil bewässert die Felder.');
 await page.locator('#flip').click();assert.equal(await page.locator('#oral-text').inputValue(),'Der Nil bewässert die Felder.');
 await page.locator('#flip').click();await page.locator('#oral-start').click();
 await page.locator('#next').click();assert.equal(await page.evaluate(()=>sessions[1].aborted),true);
 await page.evaluate(()=>sessions[1].onresult({results:[[{transcript:'Veraltetes Ergebnis'}]]}));
 assert.equal(await page.locator('#oral-text').inputValue(),'');
 await page.locator('#oral-start').click();await page.locator('#audio-read').click();
 assert.equal(await page.evaluate(()=>sessions[2].aborted),true);
 await page.locator('#oral-start').click();await page.evaluate(()=>sessions[3].onerror({error:'not-allowed'}));
 assert.match(await page.locator('#oral-status').innerText(),/nicht erlaubt/);
 assert.equal(await page.locator('#oral-start').isEnabled(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
 await fallback.goto(url);assert.equal(await fallback.locator('#oral-start').isDisabled(),true);
 await fallback.locator('#oral-text').fill('Meine Antwort');await fallback.locator('#flip').click();
 assert.equal(await fallback.locator('#oral-text').inputValue(),'Meine Antwort');
 await page.locator('#oral-language').selectOption('de-CH');
 await page.locator('#oral-start').click();
 assert.equal(await page.evaluate(()=>sessions.at(-1).lang),'de-CH');
 assert.equal(await page.evaluate(()=>sessions.at(-1).maxAlternatives),3);
 await page.evaluate(()=>{const result=[{transcript:'falsch erkannt'}];result.isFinal=false;sessions.at(-1).onresult({results:[result]});});
 assert.equal(await page.locator('#oral-text').inputValue(),'');
 assert.match(await page.locator('#oral-interim').innerText(),/falsch erkannt/);
 await page.evaluate(()=>{const result=[{transcript:'Landwirtschaft'},{transcript:'Ackerbau'}];result.isFinal=true;sessions.at(-1).onresult({results:[result]});});
 await page.locator('#oral-stop').click();
 assert.equal(await page.locator('#oral-text').inputValue(),'Landwirtschaft');
 await page.locator('#oral-choice').selectOption('Ackerbau');
 assert.equal(await page.locator('#oral-text').inputValue(),'Ackerbau');
 await page.locator('#oral-text').fill('Mein korrigierter Text');
 assert.equal(await page.locator('#oral-alternatives').isVisible(),false);
 await page.locator('#oral-check').click();assert.equal(await page.locator('#oral-result').isVisible(),true);
 await page.locator('#oral-text').fill('kein Nil');assert.equal(await page.locator('#oral-result').isVisible(),false);
 await page.locator('#oral-check').click();assert.match(await page.locator('#oral-result').innerText(),/Verneinung/);
 await page.locator('#oral-start').click();
 await page.evaluate(()=>{const result=[{transcript:'weiterer Gedanke'}];result.isFinal=true;sessions.at(-1).onresult({results:[result]});sessions.at(-1).onresult({results:[result]});});
 await page.locator('#oral-stop').click();
 assert.equal(await page.locator('#oral-text').inputValue(),'kein Nil weiterer Gedanke');
 await page.locator('#next').click();assert.equal(await page.locator('#oral-result').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('Oral controls passed with simulated recognition: transcript, editing, comparison, cancellation, stale events, permission error, fallback and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
