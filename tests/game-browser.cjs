const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8765');await page.waitForFunction(()=>document.documentElement.dataset.learningReady==='true');
 await page.locator('[data-level="profi"]').click();
 await page.locator('[data-play="review"]').click();assert.equal(await page.locator('#start-round').isDisabled(),true);
 await page.locator('#search').fill('H01');await page.locator('[data-play="game"]').click();
 await page.locator('#start-round').click();assert.equal(await page.locator('#search').isDisabled(),true);
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#card-id').innerText(),'H01');
 await page.locator('#flip').click();await page.locator('#again').click();assert.equal(await page.locator('#card-id').innerText(),'H01');
 await page.locator('#flip').click();await page.locator('#known').click();assert.equal(await page.locator('#round-result').isVisible(),true);
 assert.match(await page.locator('#result-metrics').innerText(),/5/);
 await page.locator('#result-review').click();assert.equal(await page.locator('#start-round').isDisabled(),true);
 assert.match(await page.locator('#round-availability').innerText(),/Nächste Wiederholung/);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.learningReady==='true');await page.locator('[data-play="game"]').click();assert.equal(await page.locator('#total-xp').innerText(),'5');
 // Legacy progress is eligible immediately, with difficult cards first.
 await page.evaluate(async()=>{await LearningBackup.flush(); await new Promise((resolve,reject)=>{const request=indexedDB.open('lernstand-backups-v1',1);request.onsuccess=()=>{const tx=request.result.transaction('subjects','readwrite');tx.objectStore('subjects').delete('geschichte');tx.oncomplete=()=>{request.result.close();resolve();};tx.onerror=reject;};}); localStorage.removeItem('geschichte:snapshot:v1');localStorage.removeItem('geschichte:backups:v1');localStorage.removeItem('geschichte-zum-wenden:training:v1');localStorage.setItem('geschichte-zum-wenden:v1',JSON.stringify({H01:'known',H02:'again',H03:'known'}));});
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.learningReady==='true');await page.locator('[data-play="review"]').click();assert.equal(await page.locator('#due-count').innerText(),'3');
 await page.locator('#start-round').click();assert.equal(await page.locator('#card-id').innerText(),'H02');
 await page.locator('#flip').click();await page.locator('#again').click();assert.notEqual(await page.locator('#card-id').innerText(),'H02');
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/game-desktop.png',fullPage:true});
 for(let i=0;i<3;i++){await page.locator('#flip').click();await page.locator('#known').click();}
 assert.equal(await page.locator('#round-result').isVisible(),true);assert.equal(await page.locator('#due-count').innerText(),'0');
 await page.screenshot({path:'test-results/game-result.png',fullPage:true});
 await page.locator('[data-play="game"]').click();await page.locator('#start-round').click();await page.locator('#leave-round').click();
 assert.equal(await page.locator('#round-hud').isVisible(),false);assert.equal(await page.locator('#search').isEnabled(),true);
 await page.locator('#mode').selectOption('open');await page.locator('[data-play="game"]').click();assert.equal(await page.locator('#start-round').isDisabled(),true);
 await page.locator('#mode').selectOption('all');await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/game-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#start-round').click();await page.locator('#flip').click();await page.keyboard.press('1');
 assert.equal(await page.locator('#round-streak').innerText(),'0 in Folge');
 assert.deepEqual(errors,[]);console.log('Game browser checks passed: rounds, retry queue, XP, migration, repetition dates, exclusions, exit, persistence and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
