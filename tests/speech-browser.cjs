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
  window.spoken=[];window.cancelled=0;
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'de-CH',localService:true}],cancel:()=>{window.cancelled++},speak:u=>{window.spoken.push({text:u.text,rate:u.rate,lang:u.lang});window.lastUtterance=u;}}});
 });
 const url=process.env.TEST_URL||pathToFileURL(path.join(__dirname,'../index.html')).href;
 await page.goto(url+'?vorlesen=1');
 assert.equal(await page.evaluate(()=>spoken.length),0);
 await page.locator('#audio-toggle').click();
 assert.equal(await page.evaluate(()=>spoken.at(-1).text),await page.locator('#question').innerText());
 assert.equal(await page.locator('#flip').getAttribute('aria-expanded'),'false');
 await page.locator('#next').click();assert.equal(await page.evaluate(()=>spoken.length),2);
 assert.equal(await page.evaluate(()=>spoken.at(-1).text),await page.locator('#question').innerText());
 await page.locator('#audio-rate').selectOption('0.8');assert.equal(await page.evaluate(()=>spoken.at(-1).rate),0.8);
 await page.locator('#audio-stop').click();assert.equal(await page.locator('#audio-stop').isDisabled(),true);
 await page.locator('#audio-read').click();await page.locator('#flip').click();assert.equal(await page.locator('#audio-stop').isDisabled(),true);
 const n=await page.evaluate(()=>spoken.length);await page.locator('[data-play="game"]').click();
 assert.equal(await page.locator('#audio-read').isDisabled(),true);assert.equal(await page.evaluate(()=>spoken.length),n);
 await page.locator('#start-round').click();assert.equal(await page.evaluate(()=>spoken.length),n+1);
 await page.locator('#flip').click();await page.locator('#again').click();assert.equal(await page.evaluate(()=>spoken.length),n+2);
 await page.locator('#audio-toggle').click();const count=await page.evaluate(()=>spoken.length);
 await page.locator('#flip').click();await page.locator('#known').click();assert.equal(await page.evaluate(()=>spoken.length),count);
 await page.locator('#audio-read').click();await page.evaluate(()=>lastUtterance.onerror());assert.match(await page.locator('#audio-status').innerText(),/nicht möglich/);
 assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'),'false');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 require('node:fs').mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/speech-mobile.png',fullPage:true});
 await page.reload();assert.equal(await page.evaluate(()=>spoken.length),0);
 await page.locator('#audio-read').click();
 assert.equal(await page.locator('#audio-read').innerText(),'Noch einmal hören');
 const repeatedQuestion=await page.locator('#question').innerText();
 for(let i=0;i<3;i++){
  await page.evaluate(()=>lastUtterance.onend());
  await page.locator('#audio-read').click();
  assert.equal(await page.evaluate(()=>spoken.at(-1).text),repeatedQuestion);
  assert.equal(await page.locator('#question').innerText(),repeatedQuestion);
  assert.equal(await page.locator('#flip').getAttribute('aria-expanded'),'false');
 }
 assert.equal(await page.evaluate(()=>spoken.length),4);
 await page.locator('#audio-read').click();assert.equal(await page.evaluate(()=>spoken.length),5);
 await page.locator('#next').click();assert.equal(await page.locator('#audio-read').innerText(),'Frage vorlesen');
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{delete window.speechSynthesis;delete window.SpeechSynthesisUtterance;});
 await fallback.goto(url);assert.equal(await fallback.locator('#audio-toggle').isDisabled(),true);assert.match(await fallback.locator('#audio-status').innerText(),/unterstützt.*nicht/);
 await fallback.locator('#flip').click();assert.equal(await fallback.locator('#flip').getAttribute('aria-expanded'),'true');
 assert.deepEqual(errors,[]);console.log('Speech UI checks passed with mocked voices: question-only, auto/manual, rate, stop, rounds, errors, reload, unsupported browser and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
