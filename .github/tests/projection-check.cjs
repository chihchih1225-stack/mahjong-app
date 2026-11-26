const { readFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');
const { chromium, webkit, devices } = require('playwright');
if(process.env.CI)assert(existsSync(webkit.executablePath()),'CI must run the iPhone WebKit cases');
const fixtures = {
  players: [
    {id:'east',display_name:'阿東',user:'owner'},
    {id:'south',display_name:'阿南'},
    {id:'west',display_name:'阿西'},
    {id:'north',display_name:'阿北'},
    {id:'sub',display_name:'新上桌的長名字'},
  ],
  session:{id:'testgame',room:'testroom',status:'active',updated:new Date().toISOString(),recorder:'owner',players:['west','north','east','south'],dealer:'east',round:'東1',hand_number:1,dealer_repeats:0,stake:'100/20',
    seat_map:{東:{player_id:'east'},南:{player_id:'south'},西:{player_id:'west'},北:{player_id:'north'},_recorder_wind:'南'},
    final_balances:{east:1200,south:-900,west:-250,north:-50}},
  hands:[]
};
async function view(page,url,html){
  await page.route('**/*',async r=>{
    if(r.request().url()===url && r.request().isNavigationRequest()){
      if(html) return r.fulfill({contentType:'text/html',body:html});
      return r.continue();
    }
    if(!html && (new URL(r.request().url()).origin===new URL(url).origin) && r.request().method()==='GET') return r.continue();
    return r.abort();
  });
  await page.goto(url);
  await page.waitForFunction(()=>typeof v32LoadLiveSession==='function');
}
async function recorder(page){
  await page.evaluate(()=>{
    P=['阿西','阿北','阿東','阿南'];seats=['阿東','阿南','阿西','阿北'];
    dealer='阿東';recorderPlayer='阿南';dealerSeatIndex=0;repeats=0;selectedStake='100/20';
    currentRule=stakeRules[selectedStake];
    balances={阿東:1200,阿南:-900,阿西:-250,阿北:-50};
    liveViewerMode=false;show('game');renderGame();
  });
}
async function state(page,selector='#playerStats'){
  return page.evaluate(selector=>{
    const root=document.querySelector(selector);
    const box=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}:null}
    const rs=getComputedStyle(root);
    return { display:rs.display, areas:rs.gridTemplateAreas, box:box(root), gap:parseFloat(rs.columnGap), rowGap:parseFloat(rs.rowGap), children:[...root.children].map(c=>{
      const name=c.querySelector('.player-name,.viewer-player-name');
      const money=c.querySelector('.current-money,.viewer-player-money');
      return { pos:c.className.match(/pos-(top|left|right|bottom)/)?.[1], text:name?.textContent.trim(), money:money?.textContent, dealer:c.matches('.dealer-seat,.dealer'), water:c.querySelector('.water')?.style.height, box:box(c), position:getComputedStyle(c).position, nameBox:box(name), moneyBox:box(money) };
    }) }
  },selector);
}
function seatsOk(st,list,layout=true){
  assert.equal(st.children.length,4);
  const map=Object.fromEntries(st.children.map(c=>[c.pos,c]));
  for(const [i,pos] of ['top','left','right','bottom'].entries())assert.ok(map[pos]?.text.includes(list[i]),JSON.stringify(st));
  if(!layout) return map;
  assert.equal(st.display,'grid',JSON.stringify(st));
  assert.equal(st.areas,'"top top" "left right" "bottom bottom"');
  const [top,left,right,bottom]=['top','left','right','bottom'].map(pos=>map[pos].box);
  const near=(a,b)=>Math.abs(a-b)<1;
  assert.ok(near(top.w,st.box.w)&&near(bottom.w,st.box.w),JSON.stringify(st));
  assert.ok(near(top.b+st.rowGap,left.y)&&near(left.y,right.y)&&near(left.b+st.rowGap,bottom.y),JSON.stringify(st));
  assert.ok(near(left.r+st.gap,right.x)&&st.gap<=8,JSON.stringify(st));
  assert.ok(st.children.every(c=>c.position==='relative' && c.box.h>=35 && c.moneyBox.b<=c.box.b+1 && c.moneyBox.y>=c.box.y-1 && c.moneyBox.x>=c.box.x-1 && c.moneyBox.r<=c.box.r+1),JSON.stringify(st));
  return map;
}
async function project(page){ await page.evaluate(()=>{document.documentElement.requestFullscreen=undefined; toggleProjectionMode()}); }
async function check(page,url,html){
  await view(page,url,html);
  await recorder(page);
  seatsOk(await state(page,'#seatPicker'),['阿北','阿東','阿西','阿南'],false);
  await project(page);
  const m=seatsOk(await state(page),['阿北','阿東','阿西','阿南']);
  assert.equal(m.left.money,'+$1,200');
  assert.ok(m.left.dealer && m.left.water==='92%');
  await page.locator('#playerStats .pos-right').click();
  assert.equal(await page.evaluate(()=>winner),'阿西');
  const score=await page.locator('.projection-save-hand').boundingBox();
  const panel=await page.locator('#projectionScorePanel').boundingBox();
  assert.ok(score && score.y>=panel.y && score.y+score.height<=panel.y+panel.height,JSON.stringify({score,panel}));
  await page.evaluate(()=>{
    P=['阿北','阿西','新上桌的長名字','阿東'];seats=['阿西','新上桌的長名字','阿東','阿北'];recorderPlayer='阿北';
    dealer='阿西';repeats=2;balances={阿北:300,阿西:1600,新上桌的長名字:-1000,阿東:-900};renderGame();
  });
  const next=seatsOk(await state(page),['新上桌的長名字','阿東','阿西','阿北']);
  assert.ok(next.right.dealer && next.right.text.includes('莊・連2') && next.bottom.money==='+$300');
  await project(page);
  seatsOk(await state(page,'#seatPicker'),['新上桌的長名字','阿東','阿西','阿北'],false);
  assert.equal(await page.evaluate(()=>buildSeatMap()._recorder_wind),'北');

  await page.evaluate(async mock=>{
    window.projectionFixture=mock;
    loadRoomPlayersList=async()=>window.projectionFixture.players;
    v57ResolveCheerForRoomPlayers=async()=>{};
    window.liveAuditRequests=[];
    pbRequest=async path=>{
      window.liveAuditRequests.push(path);
      if(path.includes('/game_sessions/records/testgame'))return window.projectionFixture.session;
      return {page:1,totalPages:1,items:window.projectionFixture.hands};
    };
    await v32LoadLiveSession('testgame',true);
    window.liveAuditRequests.length=0;
    await v32LoadLiveSession('testgame',false);
  },fixtures);
  assert.equal((await page.evaluate(()=>window.liveAuditRequests)).length,1,'unchanged live match only fetches metadata');
  seatsOk(await state(page),['阿西','阿北','阿南','阿東'],false);
  await project(page);
  const vm=seatsOk(await state(page),['阿北','阿東','阿西','阿南']);
  assert.ok(vm.left.dealer && vm.left.money===' +$1,200'.trim() && vm.left.water==='92%');
  assert.equal(await page.locator('#playerStats [onclick]').count(),0);
  assert.equal(await page.locator('#projectionScorePanel').isVisible(),false);
  assert.equal(await page.locator('#cashflowMatrix + #projectionLatestHand').isVisible(),true);
  await page.evaluate(async()=>{
    const {session}=window.projectionFixture;
    session.players=['east','west','north','sub'];
    session.seat_map={東:{player_id:'west'},南:{player_id:'sub'},西:{player_id:'east'},北:{player_id:'north'},_recorder_wind:'北'};
    session.dealer='west';session.dealer_repeats=2;session.hand_number=2;
    window.projectionFixture.hands=[{result:'selfdraw',winner:'west',payments:{阿北:-100,阿西:500,新上桌的長名字:-200,阿東:-200},balances_after:{阿北:300,阿西:1600,新上桌的長名字:-1000,阿東:-900}}];
    await v32LoadLiveSession('testgame',false);
  });
  const updated=seatsOk(await state(page),['新上桌的長名字','阿東','阿西','阿北']);
  assert.ok(updated.right.dealer && updated.right.text.includes('莊・連2') && updated.bottom.money===' +$300'.trim());
  assert.match(await page.locator('#playerStats .pos-right .viewer-player-meta').textContent(),/自摸 1/);
  await project(page);
  seatsOk(await state(page),['阿東','阿北','新上桌的長名字','阿西'],false);
  await page.evaluate(async()=>{
    delete window.projectionFixture.session.seat_map._recorder_wind;
    await v32LoadLiveSession('testgame',false);
  });
  await project(page);
  const legacy=seatsOk(await state(page),['阿西','新上桌的長名字','阿北','阿東']);
  assert.ok(legacy.bottom.money===' $-900'.trim());
}
async function main(){
  const remote=process.argv[2]?.startsWith('https://')?process.argv[2]:null;
  const html=remote?null:readFileSync(process.argv[2]||'index.html','utf8');
  const url=remote||'http://mahjong.test/';
  const c=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  let wk;
  if(existsSync(webkit.executablePath())) wk=await webkit.launch();
  const configs=[[c,'Chromium',1920,1080],[c,'Chromium',1280,720],[c,'Chromium',844,390],[c,'Chromium',667,375],[c,'Chromium',390,844]];
  if(wk)configs.push([wk,'WebKit',844,390],[wk,'WebKit',390,844]);
  try {
    for(const [browser,label,width,height] of configs){
      const context=await browser.newContext({...label==='WebKit'?devices['iPhone 13']:{},viewport:{width,height},serviceWorkers:'block'});
      const page=await context.newPage();
      const errs=[];page.on('pageerror',e=>errs.push(e.message));
      await check(page,url,html);
      assert.deepEqual(errs,[]);
      console.log('PASS',label,width,height);
      await context.close();
    }
  } finally {await c.close();if(wk) await wk.close();}
}
main().catch(e=>{console.error(e);process.exit(1)});
