// Requires Playwright and Chromium. Adds WebKit/iPhone coverage when WebKit is installed.
// Fully offline fixture. Neither a test room nor a hand is sent to PocketBase.
const { chromium, webkit, devices } = require('playwright');
const { readFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');
const html = readFileSync(process.argv[2] || 'index.html','utf8');
const url = 'http://mahjong.test/';

async function check(browser,viewport,iphone) {
  const context = await browser.newContext({...(iphone ? devices['iPhone 13'] : {}),viewport,serviceWorkers:'block'});
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().isNavigationRequest() && r.request().url()===url
      ?r.fulfill({contentType:'text/html',body:html}):r.abort());
    await page.goto(url);
    await page.evaluate(()=>{
      P=['阿浩','學姐','飛帆','麻俠'];seats=['麻俠','學姐','飛帆','阿浩'];recorderPlayer='學姐';dealer='飛帆';
      dealerSeatIndex=2;repeats=1;selectedStake='100/20';currentRule=stakeRules[selectedStake];
      balances={阿浩:80,學姐:-360,飛帆:620,麻俠:-340};
      hands=[{result:'自摸',winner:'飛帆',dealer:'飛帆',repeats:0,tai:7,round:'東2',patterns:[],changes:{阿浩:-240,學姐:-240,飛帆:720,麻俠:-240}}];
      liveViewerMode=false;show('game');renderGame();document.documentElement.requestFullscreen=undefined;toggleProjectionMode();
    });
    const click=(selector)=>page.locator(selector)[iphone?'tap':'click']();
    const preview=page.locator('#projectionCalcPreview');
    const tai=page.locator('#projectionTaiValue');
    const readTai=async(n)=>{
      assert.equal(await tai.textContent(),n+' 台');
      assert.equal(await page.locator('#taiNum').textContent(),n+' 台');
      assert.equal(await preview.locator('.v32-preview-head').textContent(),'本場 '+n+' 台');
      assert.equal(await preview.evaluate(e=>e.innerHTML),await page.locator('#calculationPreview').evaluate(e=>e.innerHTML));
    };
    const readAmounts=async()=>{
      const info=await preview.evaluate(el=>{
        const box=el.getBoundingClientRect();
        const rows=[...el.querySelectorAll('.payment-preview-row')].map(r=>{
          const player=r.querySelector('.payment-preview-player'), amount=r.querySelector('.payment-preview-amount');
          const a=amount.getBoundingClientRect(), name=player.getBoundingClientRect();
          return {player:player.querySelector('b').textContent, amount:amount.textContent, inside:a.bottom<=box.bottom+1 && a.right<=box.right+1 && a.x>=name.right-1};
        });
        return {rows,scroll:el.scrollHeight-el.clientHeight};
      });
      assert.equal(info.rows.length,4,JSON.stringify(info));
      assert.ok(info.rows.every(row=>row.inside),JSON.stringify(info));
      assert.ok(info.scroll<=1,JSON.stringify(info));
      return Object.fromEntries(info.rows.map(row=>[row.player,row.amount]));
    };
    await click('#projectionScorePanel [data-proj-result="自摸"]');
    await click('#playerStats .pos-bottom'); // 非莊家自摸，飛帆連1。
    await readTai(0);
    assert.match((await readAmounts())['飛帆'],/^-160/);
    for(const [delta,n] of [[1,1],[3,4],[-1,3],[2,5]]){
      await click('#projectionTaiRow button[onclick="addTai('+delta+')"]');
      await readTai(n);
      assert.match((await readAmounts())['飛帆'],new RegExp('^-'+(160+20*n)));
    }
    await click('#projectionTaiValue');
    await readTai(0);
    assert.equal(await page.evaluate(()=>handTaiExplicitlySelected),true);

    await click('#playerStats .pos-right'); // 莊家自摸，仍由記錄者手動輸入台數。
    await click('#projectionTaiRow button[onclick="addTai(3)"]');
    await readTai(3);
    const dealerWinner=await readAmounts();
    assert.match(dealerWinner['飛帆'],/^\+480/);
    assert.equal(await page.evaluate(()=>calculateHandPayments()['阿浩']),-160);

    const placement=await page.evaluate(()=>{
      const matrix=document.querySelector('#cashflowMatrix'), last=document.querySelector('#projectionLatestHand');
      const save=document.querySelector('.projection-save-hand'), panel=document.querySelector('#projectionScorePanel');
      return {underMatrix:matrix.nextElementSibling===last && last.getBoundingClientRect().y>=matrix.getBoundingClientRect().bottom,
        latest:last.textContent, saveInside:save.getBoundingClientRect().bottom<=panel.getBoundingClientRect().bottom+1};
    });
    assert.ok(placement.underMatrix && placement.saveInside,JSON.stringify(placement));
    assert.match(placement.latest,/最新一筆：飛帆 自摸 7台/);

    await click('#projectionScorePanel [data-proj-result="流局"]');
    assert.equal(await page.locator('#projectionTaiRow').isVisible(),false);
    await page.evaluate(()=>toggleProjectionMode());
    assert.equal(await page.locator('#projectionScorePanel #projectionLatestHand').count(),1);
    assert.deepEqual(errors,[]);
  } finally {await context.close();}
}

(async()=>{
  const chromiumBrowser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  let webkitBrowser;
  try{
    for(const [width,height] of [[1920,1080],[1280,720],[874,402],[844,390],[667,375]]){
      await check(chromiumBrowser,{width,height},false);
      console.log('PASS Chromium',width,height);
    }
    if(existsSync(webkit.executablePath())){
      webkitBrowser=await webkit.launch();
      for(const [width,height] of [[874,402],[844,390],[667,375]]){
        await check(webkitBrowser,{width,height},true);
        console.log('PASS WebKit touch',width,height);
      }
    }
  } finally {await chromiumBrowser.close();if(webkitBrowser) await webkitBrowser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
