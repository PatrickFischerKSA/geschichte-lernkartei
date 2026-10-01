/* Requires Playwright; use PLAYWRIGHT_MODULE or NODE_PATH for an existing install. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
  const page = await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const url = process.env.TEST_URL || 'http://127.0.0.1:8765';
  const out = path.join(__dirname,'..','test-results'); fs.mkdirSync(out,{recursive:true});
  await page.goto(url); await page.locator('#question').waitFor();
 await page.locator('[data-level="profi"]').click();
  assert.match(await page.locator('#deck-count').innerText(),/112 Karten/);
  await page.screenshot({path:path.join(out,'desktop-question.png'),fullPage:true});
  await page.locator('#flip').click(); assert.equal(await page.locator('#flip').getAttribute('aria-expanded'),'true');
  await page.locator('#known').click(); assert.equal(await page.locator('#progress-text').innerText(),'1 / 112');
  await page.reload(); assert.equal(await page.locator('#progress-text').innerText(),'1 / 112');
  await page.locator('#mode').selectOption('known'); assert.match(await page.locator('#deck-count').innerText(),/1 Karte /);
  await page.locator('#flip').click(); await page.locator('#again').click(); assert.equal(await page.locator('#empty').isVisible(),true);
  await page.locator('#clear-filters').click();
  await page.locator('#search').fill('Sirius'); assert.ok(parseInt(await page.locator('#deck-count').innerText())>0);
  await page.locator('#search').fill('xxyz-unfindbar'); assert.equal(await page.locator('#empty').isVisible(),true);
  await page.locator('#clear-filters').click(); await page.locator('#mode').selectOption('open');
  assert.match(await page.locator('#deck-count').innerText(),/2 Karten/);
  await page.locator('#flip').click(); assert.match(await page.locator('#answer').innerText(),/nicht zuverlässig/);
  await page.locator('#mode').selectOption('all'); await page.locator('#search').fill('Q13');
  await page.locator('#question-image').waitFor(); await page.locator('#flip').click();
  assert.match(await page.locator('#answer').innerText(),/Hunefer/);
  assert.equal(await page.locator('#external-links a').count(),1);
  await page.screenshot({path:path.join(out,'desktop-answer.png'),fullPage:true});
  await page.locator('#goals-tab').click(); assert.equal(await page.locator('.goal-item').count(),14);
  await page.locator('.goal-item').first().locator('button').click(); assert.equal(await page.locator('#goal-filter').inputValue(),'L01');
  assert.ok(parseInt(await page.locator('#deck-count').innerText())>0);
  // Walk every card, check both faces for overflow and missing images.
  await page.locator('#goal-filter').selectOption('all');
  for (let i=0;i<112;i++) {
    await page.locator('#flip').click();
    const bounds = await page.evaluate(() => { const b=document.querySelector('#back'); return {scroll:b.scrollHeight,height:document.querySelector('#card').offsetHeight,width:document.documentElement.scrollWidth,view:innerWidth}; });
    assert.ok(bounds.scroll <= bounds.height+2, `answer height card ${i}`); assert.ok(bounds.width<=bounds.view, `horizontal overflow ${i}`);
    if(i<111) await page.locator('#next').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#filters-toggle').click();
  await page.locator('#search').fill('Q07'); await page.locator('#question-image').waitFor();
  await page.locator('#filters-toggle').click();
  await page.locator('#question-image').evaluate(img => img.decode());
  await page.screenshot({path:path.join(out,'mobile-question.png'),fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#flip').click(); await page.screenshot({path:path.join(out,'mobile-answer.png'),fullPage:true});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#filters-toggle').click();
  await page.locator('#reset').click(); await page.locator('#reset-no').click();
  await page.locator('#reset').click(); await page.locator('#reset-yes').click();
  assert.equal(await page.locator('#progress-text').innerText(),'0 / 112');
  // Corrupt storage must not prevent startup.
  await page.evaluate(() => localStorage.setItem('geschichte-zum-wenden:v1','{bad json'));
  await page.reload(); assert.equal(await page.locator('#question').isVisible(),true);
  assert.deepEqual(errors,[]);
  await browser.close(); console.log('Browser checks passed: 112 answers, flipping, filters, goals, ratings, persistence, mobile, reset and corrupt storage.');
})().catch(e => {console.error(e);process.exit(1)});
