const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('index.html','utf8');
const fn=n=>{const m=new RegExp('(?:async )?function '+n+'\\(').exec(src);assert.ok(m,n);const j=src.indexOf('\n}',m.index);return src.slice(m.index,j+2)};
const names=['v187ShuffleSeats','gamePlayerColors','emptyCashflow','handCashflowTransfers','buildCashflowMatrix','v187CashflowRows','cashflowParticipantNames','mergeLiveCashflowSnapshot','renderCashflowMatrix','buildTrendSeries','renderMoneyPie','v187TickerEvents','v187HandBalanceSnapshot','v187DisplayHandBalances','v187LiveCurrentBalances','v186RenderLiveHands','v186LoadPreviousSeries','v187FindNextLiveSession','v32LoadLiveSession','buildSeatMap','flushRecorderSync','commitHandToCashflowLedger','rollbackHandFromCashflowLedger'];
const context={assert,console,canonicalPlayerName:s=>s||'',canonicalRoomPlayerName:p=>p?.display_name||'',escapeHtml:s=>String(s),money:n=>(n<0?'-$':'+$')+Math.abs(n),pbFilterValue:s=>s,v32SessionIsFresh:()=>true,fixtureDate:'2026-11-26 12:00:00.000Z'};
vm.createContext(context);
const run=s=>vm.runInContext(s,context);
run(names.map(fn).join('\n'));
run(String.raw`
const p0=['A','B','C','D'];
const ex=new Set();
for(let a=0;a<4;a++)for(let b=0;b<3;b++)for(let c=0;c<2;c++){
  const rnd=[(a+.5)/4,(b+.5)/3,(c+.5)/2];ex.add(v187ShuffleSeats(p0,()=>rnd.shift()).join(''));
}
assert.equal(ex.size,24);assert.equal(p0.join(''),'ABCD');
let seed=27;
const freq=Object.fromEntries(p0.map(p=>[p,[0,0,0,0]]));
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<48000;i++)v187ShuffleSeats(p0,random).forEach((p,seat)=>freq[p][seat]++);
for(const row of Object.values(freq))for(const count of row)assert.ok(count>11500&&count<12500,count);
console.log('PASS all 24 permutations and 48,000 seat draws');
let P=['A','E','C','D'],seats=P,hands=[],balances={A:800,E:0,C:-300,D:0};
let liveViewerMode=false,seriesCashflowLedger={A:{},B:{A:500},C:{A:300},D:{}},seriesCashflowBase={},liveCashflowSnapshot=null;
let dealer='A',repeats=1;
const nodes={};const document={getElementById:id=>nodes[id]??=( {innerHTML:'',textContent:'',style:{},classList:{add(){}}} )};
let v186LiveGameNumber=2,v186PreviousSeriesHands=[],v186PreviousSeriesKey='',liveReadCache=null,liveReadGeneration=0;
let v187LiveEndedAt=0, v32ViewingSessionId='active',currentRoomId='r',selectedStake,currentRule,gameStartedAt,gameEndedAt,v52LiveEndedNoticeFor,recorderPlayer,roundIndex,dealerSeatIndex,sessionOpeningBalances;
const winds=['東','南','西','北'],stakeRules={'100/20':{}},v52SeatNamesFromSession=(ss,byId,n)=>n;
const v187ShowLiveBetween=text=>{globalThis.between=text||''};let shown=0;
const renderGame=()=>shown++,v33StartGameClock=()=>{},show=()=>{},v32RenderViewerDashboard=()=>v186RenderLiveHands(),v32StopLivePoll=()=>{},v52StopAllLiveRuntime=()=>{},returnToCurrentRoom=()=>{},uiAlert=async()=>{},v57ResolveCheerForRoomPlayers=async()=>{};
const roster=['A','B','C','D','E'].map(display_name=>({id:display_name,display_name}));
const loadRoomPlayersList=async()=>roster;
const funds=seriesCashflowLedger;
for(const viewer of [false,true]){
  let ledger={A:{},B:{A:500},C:{A:300},D:{}};
  P=['A','E','C','D'];seats=P;
  liveViewerMode=viewer;seriesCashflowLedger=ledger;liveCashflowSnapshot=viewer?ledger:null;
  balances={A:800,E:0,C:-300,D:0};hands=[];
  assert.equal(buildTrendSeries(hands,P)[0].values.A,800);
  assert.equal(v187CashflowRows(P)[0].others,500);
  renderCashflowMatrix();assert.match(nodes.cashflowMatrix.innerHTML,/離場<br>對手/);assert.match(nodes.cashflowMatrix.innerHTML,/\+\$800/);
  hands=[{changes:{A:100,C:-100}}];balances={A:900,E:0,C:-400,D:0};ledger.C.A+=100;
  assert.equal(buildTrendSeries(hands,P).at(-1).values.A,900);
  assert.equal(buildTrendSeries(hands,P)[0].values.A,800);
  assert.equal(buildTrendSeries(hands,P,true)[0].values.A,0);
  renderMoneyPie();assert.match(nodes.moneyLegend.innerHTML,/\+\$900/);
  P=['E','B','C','D'];seats=P;balances={E:0,B:-500,C:-300,D:0};hands=[];ledger.C.A-=100;
  renderMoneyPie();assert.match(nodes.moneyLegend.innerHTML,/-\$500/);assert.equal(nodes.moneyPie.style.background,'#eee');
  renderCashflowMatrix();assert.match(nodes.cashflowMatrix.innerHTML,/-\$500/);
  balances.B=-600;renderCashflowMatrix();assert.match(nodes.cashflowMatrix.innerHTML,/未分列/);
}
console.log('PASS both display modes, swap payer/winner, opening, first hand, and money without opponent details');
P=['A','B','C','D'];balances={A:450,B:550,C:-500,D:-500};dealer='B';repeats=2;
assert.deepEqual(Array.from(v187TickerEvents({dealer:'B',winner:'B',result:'自摸',changes:{A:-100,B:300,C:-100,D:-100}})).map(x=>x.split(' ')[0]),['🀄','🔥','👑']);
assert.ok(!v187TickerEvents({dealer:'B',winner:'B',result:'自摸',changes:{B:0}}).some(x=>x.includes('反超')));
console.log('PASS ticker reports a real self-draw, streak and lead change');
const old={id:'old',room:'r',status:'completed',players:['A','B','C','D'],recorder:'u',seat_map:{_series_id:'series1',_series_index:1},started_at:fixtureDate};
const next={id:'next',room:'r',status:'active',players:['A','E','C','D'],recorder:'u',dealer:'A',round:'東1',hand_number:1,seat_map:{_series_id:'series1',_series_index:2,_series_cashflow_snapshot:funds},started_at:fixtureDate,final_balances:{A:800,E:0,C:-300,D:0}};
let found=[],nextHands=[],lookups=0;
let seriesId='series1',seriesGameCount=1,seriesStartedAt=fixtureDate,recorderSync,remoteRoomPlayerMap=Object.fromEntries(roster.map(p=>[p.id,p]));
const assertRecorderScope=s=>assert.equal(s,recorderSync),persistActiveGame=()=>true,recorderSyncNotice=()=>{},getRoundName=()=>'東1';
const syncRemoteConfirmedHand=async(s,hand,n)=>{
  s.known[n]=hand.syncId;
  nextHands.push({id:hand.syncId,result:'win',winner:hand.winner,discarder:hand.discarder,payments:hand.changes,balances_after:{...balances}});
};
const pbRequest=async (path,options={})=>{
  if(path.includes('/game_hands/')){
    const id=path.split('/').at(-1);
    if(options.method==='DELETE'){nextHands=nextHands.filter(h=>h.id!==id);return}
    return {session:'next',hand_number:1};
  }
  if(options.method==='PATCH')Object.assign(next,JSON.parse(options.body));
  return path.endsWith('/old')?old:next;
};
const pbAllRecords=async (name,opt)=>{lookups++;return opt.filter.includes('status="active"')?found:[old]};
const pbHandsBySession=async ()=>new Map([['old',[{result:'win',winner:'A',discarder:'B',payments:{A:500,B:-500},balances_after:{A:800,B:-500,C:-300,D:0}}]]]);
const cloudHands=async()=>nextHands;
`);
(async()=>{
 await run(String.raw`(async()=>{
   v32ViewingSessionId='old';
   assert.equal(await v32LoadLiveSession('old'),true);assert.match(between,/等待/);
   found=[{...next,id:'other',seat_map:{_series_id:'unrelated',_series_index:2}}];
   assert.equal(await v187FindNextLiveSession(old),null);
   found=[next,{...next,id:'duplicate'}];
   assert.equal(await v187FindNextLiveSession(old),null);
   found=[next];
   assert.equal(await v32LoadLiveSession('old'),true);
   assert.equal(v32ViewingSessionId,'next');assert.equal(between,'');assert.equal(balances.A,800);
   assert.match(nodes.v186LiveHands.innerHTML,/第 1 將/);assert.match(nodes.v186LiveHands.innerHTML,/B -\$500/);
   const asRecorder=()=>{
     liveViewerMode=false;liveCashflowSnapshot=null;
     recorderSync={sessionId:'next',sessionChecked:true,known:{},undo:[]};
   };
   asRecorder();seriesCashflowLedger=JSON.parse(JSON.stringify(funds));seriesCashflowBase=funds;
   assert.equal(await flushRecorderSync(),true);
   assert.equal(next.seat_map._series_cashflow_snapshot.B.A,500);
   const h={syncId:'hand2',result:'胡牌',winner:'A',discarder:'C',changes:{A:100,C:-100}};
   hands=[h];balances={A:900,C:-400,E:0,D:0};
   commitHandToCashflowLedger(h);
   assert.equal(await flushRecorderSync(),true);
   const snapshot=next.seat_map._series_cashflow_snapshot;
   assert.equal(snapshot.B.A,500);assert.equal(snapshot.C.A,400);
   const recorderRow=v187CashflowRows(P)[0];
   const restartViewer=()=>{liveReadCache=null;v186PreviousSeriesKey='';liveCashflowSnapshot=null};
   restartViewer();
   assert.equal(await v32LoadLiveSession('next',true),true);assert.equal(balances.A,900);
   assert.deepEqual(v187CashflowRows(P)[0],recorderRow);
   renderCashflowMatrix();assert.match(nodes.cashflowMatrix.innerHTML,/離場<br>對手/);assert.doesNotMatch(nodes.cashflowMatrix.innerHTML,/未分列/);
   const list=nodes.v186LiveHands.innerHTML;
   assert.ok(list.indexOf('第 2 將')<list.indexOf('第 1 將'));
   assert.match(list,/本把輸贏・A \+\$100/);assert.match(list,/連打累計.*A \+\$900/);
   const last=shown;await v32LoadLiveSession('next');assert.equal(shown,last);
   next.seat_map._series_cashflow_snapshot=Object.fromEntries(P.map(from=>[from,Object.fromEntries(P.map(to=>[to,snapshot[from]?.[to]||0]))]));
   restartViewer();assert.equal(await v32LoadLiveSession('next',true),true);
   assert.deepEqual(v187CashflowRows(P)[0],recorderRow);
   assert.equal(mergeLiveCashflowSnapshot({B:{A:500}},{B:{A:0}}).B.A,0);
   liveViewerMode=false;hands=[];balances={...next.final_balances};
   rollbackHandFromCashflowLedger(h);recorderSync.undo.push({id:h.syncId,n:1});
   assert.equal(await flushRecorderSync(),true);assert.equal(next.seat_map._series_cashflow_snapshot.C.A,300);
   assert.equal(await v32LoadLiveSession('next'),true);
   assert.equal(v187CashflowRows(P)[0].total,800);
   assert.equal(v187CashflowRows(P)[0].others,500);
   assert.equal(v187CashflowRows(P)[0].unexplained,0);
   console.log('PASS recorder sync, next hand, fresh live reload, legacy snapshot compatibility and undo');
   assert.equal(v187LiveCurrentBalances(['A'],{A:800},[{payments:{A:100}}]).A,900);
   console.log('PASS live waits, ignores unrelated/ambiguous sessions, carries the opening, and shows both sets of hand amounts');
 })()`);
})().catch(e=>{console.error(e);process.exitCode=1});
