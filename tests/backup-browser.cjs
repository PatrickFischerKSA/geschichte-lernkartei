const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'..');
const selected=require('../package.json').name.replace('-lernkartei','');
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]).split('/').slice(2).join('/'));fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/plain');res.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
 const context=await browser.newContext(),url='http://127.0.0.1:'+server.address().port;
 const errors=[],files={};
 for(const subject of [selected]){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/'+subject+'-lernkartei/index.html');await page.locator('#question').waitFor();
  const id=await page.locator('#card-id').innerText();
  await page.locator('#flip').click();await page.locator('#known').click();
  await page.locator('[data-level="profi"]').click();
  await page.evaluate(()=>LearningBackup.flush());
  await page.locator('.backup-panel summary').click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#backup-export').click()]);
  files[subject]=await download.path();const data=JSON.parse(fs.readFileSync(files[subject]));
  assert.equal(data.subject,subject);assert.equal(data.state.progress[id],'known');assert.equal(data.state.level,'profi');assert.ok(data.state.training.records[id].due>Date.now());
  // Recover from IndexedDB when every localStorage item for this subject disappears.
  await page.evaluate(s=>{for(const key of Object.keys(localStorage))if(key.startsWith(s))localStorage.removeItem(key);},subject);
  await page.reload();await page.locator('#question').waitFor();assert.equal(await page.locator('#progress-text').innerText(),'1 / '+(subject==='geschichte'?112:158));
  assert.equal(await page.locator('[data-level="profi"]').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>LearningBackup.flush());
  await page.locator('#reset').click();await page.locator('#reset-yes').click();await page.evaluate(()=>LearningBackup.flush());
  assert.match(await page.locator('#progress-text').innerText(),/^0 /);
  await page.locator('.backup-panel summary').click();
  await page.locator('#backup-history').selectOption('1');
  page.once('dialog',d=>d.accept());
  await page.locator('#backup-restore').click();await page.waitForLoadState('load');await page.waitForFunction(()=>document.getElementById('progress-text').textContent.startsWith('1 /'));
  await page.close();
 }
 // New browser profile: import and persist full state, reject wrong subject and malformed file.
 for(const subject of [selected]){
  const ctx=await browser.newContext(),page=await ctx.newPage();await page.goto(url+'/'+subject+'-lernkartei/index.html');await page.locator('#question').waitFor();await page.locator('.backup-panel summary').click();
  const other=subject==='geschichte'?'geografie':'geschichte';
  const foreign=JSON.parse(fs.readFileSync(files[subject]));foreign.subject=other;await page.locator('#backup-import').setInputFiles({name:'foreign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(foreign))});await page.waitForFunction(()=>document.getElementById('backup-status').textContent.includes('nicht zu dieser'));
  await page.locator('#backup-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.getElementById('backup-status').textContent.includes('keine gültige'));
  page.once('dialog',d=>d.accept());await page.locator('#backup-import').setInputFiles(files[subject]);
  await page.waitForFunction(()=>document.getElementById('progress-text').textContent.startsWith('1 /'));
  await page.reload();await page.locator('#question').waitFor();assert.match(await page.locator('#progress-text').innerText(),/^1 /);
  assert.equal(await page.locator('[data-level="profi"]').getAttribute('aria-pressed'),'true');await ctx.close();
 }
 const legacy=await browser.newContext();
 const firstId=selected==='geschichte'?'H01':'G01',due=Date.now()+86400000*14;
 await legacy.addInitScript(({s,id,due})=>{
  localStorage.setItem(s+'-zum-wenden:v1',JSON.stringify({[id]:'known'}));
  localStorage.setItem(s+'-zum-wenden:training:v1',JSON.stringify({xp:137,rounds:4,records:{[id]:{level:4,due,rewardDay:'2026-10-5'}}}));
  localStorage.setItem(s+'-zum-wenden:level:v1','vertieft');
 },{s:selected,id:firstId,due});
 const oldPage=await legacy.newPage();await oldPage.goto(url+'/'+selected+'-lernkartei/index.html');await oldPage.locator('#question').waitFor();await oldPage.evaluate(()=>LearningBackup.flush());
 const migrated=await oldPage.evaluate(s=>JSON.parse(localStorage.getItem(s+':snapshot:v1')),selected);
 assert.equal(migrated.state.training.xp,137);assert.equal(migrated.state.training.rounds,4);assert.equal(migrated.state.training.records[firstId].due,due);assert.equal(migrated.state.level,'vertieft');
 await legacy.close();
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:undefined});Storage.prototype.setItem=function(){throw Error('blocked')};});
 const p=await blocked.newPage();await p.goto(url+'/'+selected+'-lernkartei/index.html');await p.locator('#question').waitFor();await p.locator('#flip').click();await p.locator('#known').click();await p.evaluate(()=>LearningBackup.flush());await p.locator('.backup-panel summary').click();
 assert.match(await p.locator('#backup-status').innerText(),/nicht möglich/);
 const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#backup-export').click()]);assert.equal(Object.keys(JSON.parse(fs.readFileSync(await d.path())).state.progress).length,1);
 assert.deepEqual(errors,[]);console.log(selected+': autosave, IndexedDB recovery, reset recovery, export/import across profiles, subject isolation, validation, blocked storage fallback passed.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
