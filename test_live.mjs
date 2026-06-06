import pw from 'file:///C:/Users/Anto/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pw;

const LIVE = 'https://fivetechsoft.github.io/vibeOS/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: '+e.message));

// Mock DeepSeek
const APP = '<div id="ct-out" style="font-size:30px">0</div><button id="ct-inc">+</button><scr'+'ipt>var n=0;$("#ct-inc").onclick=function(){n++;$("#ct-out").textContent=n;};</scr'+'ipt>';
await page.route('**/chat/completions', route => {
  route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ choices:[{ message:{ content: APP } }] }) });
});
// Mock CORS proxy
await page.route('**/allorigins.win/**', route => {
  route.fulfill({ status:200, contentType:'text/html', body: '<h1>LIVE PAGE</h1>' });
});

await page.addInitScript(() => { try { if(!localStorage.getItem('vibeos_ds_key')) localStorage.setItem('vibeos_ds_key','k'); } catch(e){} });
await page.goto(LIVE, { waitUntil: 'networkidle' });
// Clear recent apps once only before generating
await page.evaluate(() => { try { localStorage.removeItem('vibeos_recent_apps'); } catch(e){} });

let pass = true;
async function typeCmd(text) {
  await page.click('#cmd-term');
  await page.waitForTimeout(30);
  await page.keyboard.type(text);
}

// ===== CMD inline terminal =====
console.log('--- CMD Inline Terminal ---');
await page.click('#icon-cmd');
await page.waitForSelector('#cmd-term', { timeout: 5000 }); await page.waitForTimeout(400);

// No old input bar
let noInput = await page.evaluate(() => !document.getElementById('cmd-input'));
console.log('no old input:', noInput ? 'OK' : 'FAIL');
if (!noInput) pass = false;

// Echo
await typeCmd('echo live test'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let echo = await page.evaluate(() => document.getElementById('cmd-term').textContent.includes('live test'));
console.log('echo:', echo ? 'OK' : 'FAIL');
if (!echo) pass = false;

// Ver
await typeCmd('ver'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let ver = await page.evaluate(() => document.getElementById('cmd-term').textContent.includes('Microsoft Windows'));
console.log('ver:', ver ? 'OK' : 'FAIL');
if (!ver) pass = false;

// Dir
await typeCmd('dir'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let dir = await page.evaluate(() => { var t = document.getElementById('cmd-term').textContent; return t.includes('File(s)'); });
console.log('dir:', dir ? 'OK' : 'FAIL');
if (!dir) pass = false;

// Cd to root
await typeCmd('cd \\'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let cd = await page.evaluate(() => document.getElementById('cmd-term').textContent.includes('C:\\>'));
console.log('cd \\\\:', cd ? 'OK' : 'FAIL');
if (!cd) pass = false;

// Cls
await typeCmd('cls'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let cls = await page.evaluate(() => document.getElementById('cmd-term').textContent.trim() === 'C:\\>');
console.log('cls:', cls ? 'OK' : 'FAIL');
if (!cls) pass = false;

// Prompt inline at end
let promptEnd = await page.evaluate(() => document.getElementById('cmd-term').textContent.endsWith('C:\\> '));
console.log('prompt at end:', promptEnd ? 'OK' : 'FAIL');
if (!promptEnd) pass = false;

// Date (proves terminal still functional)
await typeCmd('date'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
let date = await page.evaluate(() => { var t = document.getElementById('cmd-term').textContent; return t.includes(new Date().toDateString()); });
console.log('date:', date ? 'OK' : 'FAIL');
if (!date) pass = false;

await page.click('#win-cmd .close-btn').catch(() => {}); await page.waitForTimeout(150);

// ===== Single-click desktop icons =====
console.log('\n--- Desktop Icons Single-Click ---');
await page.click('#icon-calc');
await page.waitForSelector('#calc-display', { timeout: 5000 }); await page.waitForTimeout(200);
await page.click('#calc-3'); await page.click('#calc-add'); await page.click('#calc-4'); await page.click('#calc-eq');
let calc = await page.inputValue('#calc-display');
console.log('calc 3+4 =', calc, calc==='7' ? 'OK' : 'FAIL');
if (calc !== '7') pass = false;
await page.click('#win-calc .close-btn'); await page.waitForTimeout(150);

// Notepad
await page.click('#icon-notepad');
await page.waitForSelector('#np-textarea', { timeout: 5000 }); await page.waitForTimeout(200);
await page.fill('#np-textarea', 'live');
let np = await page.inputValue('#np-textarea');
console.log('notepad:', np, np==='live' ? 'OK' : 'FAIL');
if (np !== 'live') pass = false;
await page.click('#win-notepad .close-btn'); await page.waitForTimeout(150);

// ===== Paint =====
console.log('\n--- Paint ---');
await page.click('#icon-paint');
await page.waitForSelector('#pt-canvas canvas', { timeout: 5000 }); await page.waitForTimeout(500);
var box = await page.evaluate(() => { var cv = document.querySelector('#pt-canvas canvas'); var r = cv.getBoundingClientRect(); return { left: r.left, top: r.top, w: cv.width, h: cv.height }; });
var ccw = Math.floor(box.w/2), cch = Math.floor(box.h/2);
await page.click('#pt-tool-pencil'); await page.waitForTimeout(50);
await page.mouse.move(box.left + ccw - 30, box.top + cch);
await page.mouse.down();
await page.mouse.move(box.left + ccw + 30, box.top + cch, { steps: 6 });
await page.mouse.up(); await page.waitForTimeout(150);
let pencil = await page.evaluate(({x,y}) => { var d = document.querySelector('#pt-canvas canvas').getContext('2d').getImageData(x,y,1,1).data; return d[0]; }, {x: ccw, y: cch});
console.log('pencil:', pencil, pencil < 200 ? 'OK' : 'FAIL');
if (pencil >= 200) pass = false;
await page.click('#win-paint .close-btn'); await page.waitForTimeout(150);

// ===== Generated apps + recent =====
console.log('\n--- Generate + Persist ---');
await page.click('#btn-start'); await page.click('#start-run');
await page.fill('#run-input', 'tally'); await page.click('#run-ok');
await page.waitForSelector('.window-body #ct-inc', { timeout: 8000 }); await page.waitForTimeout(300);
await page.click('.window-body #ct-inc');
await page.click('.window-body #ct-inc');
let gen = await page.textContent('.window-body #ct-out');
console.log('generated ++:', gen, gen==='2' ? 'OK' : 'FAIL');
if (gen !== '2') pass = false;

// Desktop icon single-click
await page.evaluate(() => { document.querySelectorAll('#windows-container .window').forEach(w => w.remove()); });
await page.waitForTimeout(200);
let icon = await page.evaluate(() => !!document.querySelector('#desktop-icons .desktop-icon[data-recent="tally"]'));
await page.click('#desktop-icons .desktop-icon[data-recent="tally"]');
await page.waitForSelector('.window-body #ct-inc', { timeout: 5000 }); await page.waitForTimeout(200);
await page.click('.window-body #ct-inc');
let desk = await page.textContent('.window-body #ct-out');
console.log('desktop icon:', icon, 'launch:', desk, icon && desk==='1' ? 'OK' : 'FAIL');
if (!icon || desk !== '1') pass = false;

// Persist reload
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
let reload = await page.evaluate(() => !!document.querySelector('#desktop-icons .desktop-icon[data-recent="tally"]'));
await page.click('#desktop-icons .desktop-icon[data-recent="tally"]');
await page.waitForSelector('.window-body #ct-inc', { timeout: 5000 }); await page.waitForTimeout(200);
await page.click('.window-body #ct-inc');
let rel = await page.textContent('.window-body #ct-out');
console.log('reload:', reload, 'launch:', rel, reload && rel==='1' ? 'OK' : 'FAIL');
if (!reload || rel !== '1') pass = false;

// ===== Summary =====
console.log('\n=== LIVE RESULTS ===');
const realErrors = errors.filter(e => !e.includes('allorigins') && !e.includes('CORS') && !e.includes('ERR_FAILED'));
console.log(realErrors.length ? 'REAL ERRORS: ' + JSON.stringify(realErrors) : 'No real errors');
console.log(pass && realErrors.length===0 ? 'ALL LIVE TESTS PASS' : 'SOME FAILURES');

await browser.close();
process.exit(pass && realErrors.length===0 ? 0 : 1);
