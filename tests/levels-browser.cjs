const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {cards}=require('../cards.json');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8765');await page.waitForFunction(()=>document.documentElement.dataset.learningReady==='true');
 const ranks={basis:0,vertieft:1,profi:2};
 for(const level of Object.keys(ranks)){
  await page.locator(`[data-level="${level}"]`).click();
  const expected=cards.filter(c=>ranks[c.level]<=ranks[level]).length;
  assert.match(await page.locator('#deck-count').innerText(),new RegExp(`^${expected} Karten`));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.learningReady==='true');assert.equal(await page.locator(`[data-level="${level}"]`).getAttribute('aria-pressed'),'true');
 }
 await page.evaluate(()=>localStorage.setItem('geschichte-zum-wenden:v1',JSON.stringify({H01:'again',H03:'again',H11:'again'})));
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.learningReady==='true');await page.locator('[data-play="review"]').click();
 for(const [level,count] of [['basis',1],['vertieft',2],['profi',3]]){
  await page.locator(`[data-level="${level}"]`).click();assert.equal(await page.locator('#due-count').innerText(),String(count));
 }
 await page.locator('[data-level="basis"]').click();await page.locator('#start-round').click();
 assert.equal(await page.locator('#card-id').innerText(),'H01');
 assert.equal(await page.locator('[data-level="profi"]').isDisabled(),true);
 await page.locator('#flip').click();await page.locator('#known').click();
 assert.equal(await page.locator('#round-result').isVisible(),true);
 await page.locator('[data-level="profi"]').click();assert.equal(await page.locator('#due-count').innerText(),'2');
 await page.locator('[data-level="basis"]').click();await page.locator('[data-play="game"]').click();await page.locator('#start-round').click();
 for(let i=0;i<10;i++){
  const id=await page.locator('#card-id').innerText();assert.equal(cards.find(c=>c.id===id).level,'basis');
  await page.locator('#flip').click();await page.locator('#known').click();
 }
 await page.locator('[data-play="free"]').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'test-results/levels-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('Level checks passed: progressive pools, persistence, due counts, shared progress, game selection, locked round level and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
