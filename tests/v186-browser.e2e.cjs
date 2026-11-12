// 真正 Chromium + 完整頁面；所有外部請求攔截，禁止碰正式 PocketBase。
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
let server,browser,base;
test.before(async()=>{
  const root=path.resolve(__dirname,'..');
  server=http.createServer((req,res)=>{
    const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server?.close(r))});
async function pageForGame(){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.goto(base);
  await page.evaluate(()=>{
    P=['A','B','C','D'];seats=[...P];balances={A:0,B:0,C:0,D:0};sessionOpeningBalances={...balances};
    hands=[];dealer='A';dealerSeatIndex=0;roundIndex=0;repeats=0;roundLeaders=[];mode='detailed';
    selectedStake='100/20';currentRule=stakeRules[selectedStake];seriesCashflowBase={};seriesCashflowLedger=null;
    result='胡牌';winner='';discarder='';tai=0;remoteSessionId='';pbAuth=null;handTaiExplicitlySelected=false;
    show('game');renderGame();
  });
  return {page,context,errors};
}
async function state(page){return page.evaluate(()=>({balances,hands:JSON.parse(JSON.stringify(hands)),dealer,repeats,roundIndex,winner,tai,flag:V186_AUTO_SCORE_ENABLED}))}
test('手機記錄按鈕連按、重整恢復：金額只計一次',async()=>{
  const {page,context,errors}=await pageForGame();
  await page.evaluate(()=>{selectWinner('B');selectDiscarder('C')});
  await page.locator('#game .tai-btn').filter({hasText:'+1'}).click();
  await page.locator('#game button.primary[onclick="saveHand()"]').dblclick();
  let s=await state(page);assert.equal(s.hands.length,1);assert.deepEqual(s.balances,{A:0,B:120,C:-120,D:0});assert.equal(s.dealer,'B');assert.equal(s.flag,false);
  await page.reload();await page.evaluate(()=>resumeActiveGame());s=await state(page);
  assert.equal(s.hands.length,1);assert.equal(s.balances.B,120);assert.equal(s.winner,'');
  assert.deepEqual(errors,[]);await context.close();
});
test('投影記錄、自摸及連莊：使用相同提交保護',async()=>{
  const {page,context,errors}=await pageForGame();
  await page.evaluate(()=>{result='自摸';selectWinner('A');resetTai();document.getElementById('projectionControlPanel')?.classList.remove('hidden')});
  // 投影控制元件在一般模式隱藏，直接派送按鈕點擊以測試同一個產品入口。
  await page.locator('.projection-save-hand').evaluate(el=>{el.click();el.click()});
  const s=await state(page);assert.equal(s.hands.length,1);assert.deepEqual(s.balances,{A:360,B:-120,C:-120,D:-120});assert.equal(s.repeats,1);assert.equal(s.roundIndex,0);
  assert.deepEqual(errors,[]);await context.close();
});
test('儲存空間失敗會回復金額、莊家與帳本，選擇仍保留',async()=>{
  const {page,context,errors}=await pageForGame();
  await page.evaluate(()=>{selectWinner('B');selectDiscarder('C');addTai(1);Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')};saveHand()});
  const s=await state(page);assert.equal(s.hands.length,0);assert.deepEqual(s.balances,{A:0,B:0,C:0,D:0});assert.equal(s.dealer,'A');assert.equal(s.winner,'B');assert.equal(s.tai,1);
  assert.deepEqual(errors,[]);await context.close();
});
test('預覽寫入保護在完整頁面阻擋正式 API，離線資料仍可恢復',async()=>{
  const {page,context}=await pageForGame();let outgoing=0;
  page.on('request',r=>{if(r.url().includes('api.mahjongbattle.app'))outgoing++});
  const message=await page.evaluate(async()=>{try{await pbRequest('/api/collections/game_hands/records',{method:'POST',body:'{}'})}catch(e){return e.message}});
  assert.match(message,/唯讀/);assert.equal(outgoing,0);
  await page.evaluate(()=>{selectWinner('B');selectDiscarder('C');resetTai();saveHand()});
  await context.setOffline(true); // 模擬失去網路；已保存資料不依賴遠端
  assert.equal(await page.evaluate(()=>getActiveGame().hands.length),1);
  await context.setOffline(false);await page.reload();await page.evaluate(()=>resumeActiveGame());
  assert.equal((await state(page)).hands.length,1);await context.close();
});

test('中途登錄帶入金額與連莊，不虛構先前逐把紀錄',async()=>{
  const {page,context,errors}=await pageForGame();
  await page.evaluate(async()=>{recorderPlayer='A';v183MidgamePending={values:[300,-100,-200,0],roundIndex:5,repeats:2};await confirmDealer()});
  const s=await state(page);assert.deepEqual(s.balances,{A:300,B:-100,C:-200,D:0});assert.equal(s.hands.length,0);assert.equal(s.roundIndex,5);assert.equal(s.repeats,2);
  await page.evaluate(()=>{result='胡牌';selectWinner('A');selectDiscarder('B');resetTai();saveHand()});
  const after=await state(page);assert.equal(after.hands.length,1);assert.equal(after.balances.A,400);assert.equal(after.balances.B,-200);assert.equal(after.repeats,3);
  assert.deepEqual(errors,[]);await context.close();
});
test('連打換人保留離場者金額與金流，重新開啟仍等待選位',async()=>{
  const {page,context,errors}=await pageForGame();
  await page.evaluate(()=>{
    selectWinner('B');selectDiscarder('A');resetTai();saveHand();
    sessionSaved=true;balances.E=0;v183RenderNextMatch();
    document.getElementById('nextMatchLeaving').value='A';document.getElementById('nextMatchJoining').value='E';v183ConfirmNextMatch();
  });
  const saved=await page.evaluate(()=>({P,balances,g:getActiveGame(),matrix:seriesCashflowLedger}));
  assert.deepEqual(saved.P,['E','B','C','D']);assert.equal(saved.balances.A,-100);assert.equal(saved.balances.B,100);assert.equal(saved.matrix.A.B,100);assert.equal(saved.g.resumeStage,'seat');assert.equal(saved.g.hands.length,0);
  await page.reload();assert.equal(await page.evaluate(()=>getActiveGame().balances.A),-100);assert.deepEqual(errors,[]);await context.close();
});

test('16 局閒家胡牌輪莊至北四結束；流局只連莊',async()=>{
  const {page,context,errors}=await pageForGame();
  await page.evaluate(()=>{result='流局';saveHand()});
  let s=await state(page);assert.equal(s.hands.length,1);assert.equal(s.repeats,1);assert.equal(s.roundIndex,0);assert.deepEqual(s.balances,{A:0,B:0,C:0,D:0});
  await page.evaluate(()=>{
    for(let i=0;i<16;i++){
      const next=seats[(dealerSeatIndex+1)%4];result='胡牌';winner=next;discarder=dealer;tai=0;saveHand();
    }
  });
  s=await state(page);assert.equal(s.hands.length,17);assert.equal(s.roundIndex,15);
  assert.equal(Object.values(s.balances).reduce((a,b)=>a+b,0),0);
  await page.waitForFunction(()=>!document.getElementById('done').classList.contains('hidden'));
  assert.deepEqual(errors,[]);await context.close();
});
