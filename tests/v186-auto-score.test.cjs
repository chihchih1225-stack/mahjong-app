// V186 安全測試：只讀取 HTML 原始碼，不連線 PocketBase、不修改任何牌局。
// 執行：node --test tests/v186-auto-score.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// 使用語法樹，保留 async 與預設物件參數；不可用括號計數截斷函式。
const acorn = require('acorn');
const functions = new Map();
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  if (!match[1].trim()) continue;
  const source = match[1];
  const ast = acorn.parse(source, {ecmaVersion:'latest'});
  for (const node of ast.body) if (node.type==='FunctionDeclaration') {
    functions.set(node.id.name, source.slice(node.start,node.end));
  }
}
function extractFunction(name) {
  assert.ok(functions.has(name), 'Missing function '+name);
  return functions.get(name);
}
function checkHand({result='胡牌', tai=1, explicit=true, winner='A', discarder='B', viewer=false}={}) {
  const context = {liveViewerMode:viewer, P:['A','B','C','D'], result, tai,
    handTaiExplicitlySelected:explicit, winner, discarder};
  vm.createContext(context);
  vm.runInContext(extractFunction('canAutoRecordCurrentHand'), context);
  return vm.runInContext('canAutoRecordCurrentHand()', context);
}
test('胡牌：選齊三項才可排程', () => {
  assert.equal(checkHand(), true);
  assert.equal(checkHand({winner:''}), false);
  assert.equal(checkHand({discarder:''}), false);
  assert.equal(checkHand({discarder:'A'}), false);
  assert.equal(checkHand({explicit:false}), false);
});
test('自摸：不需要放槍者，但需要明確選台數', () => {
  assert.equal(checkHand({result:'自摸', discarder:''}), true);
  assert.equal(checkHand({result:'自摸', explicit:false}), false);
});
test('零台須明確點選；負台數、流局、詐胡不可自動提交', () => {
  assert.equal(checkHand({tai:0, explicit:true}), true);
  assert.equal(checkHand({tai:0, explicit:false}), false);
  assert.equal(checkHand({tai:-1}), false);
  assert.equal(checkHand({result:'流局'}), false);
  assert.equal(checkHand({result:'詐胡'}), false);
});
test('直播觀看者不可記錄', () => assert.equal(checkHand({viewer:true}), false));
test('未完成遠端冪等性驗證前，V186 自動計分必須關閉', () => {
  assert.match(html, /const V186_AUTO_SCORE_ENABLED=false\b/);
});
test('儲存與恢復都保留遠端牌局識別碼', () => {
  assert.match(extractFunction('activeGameSnapshot'), /remoteSessionId:remoteSessionId\|\|''/);
  assert.match(extractFunction('resumeActiveGame'), /remoteSessionId=typeof g\.remoteSessionId/);
});
test('遠端同步目前仍未具備可驗證的冪等保證：標記為待完成', () => {
  const sync = extractFunction('syncRemoteConfirmedHand');
  assert.match(extractFunction('v186CreateOrVerifyHand'), /game_hands\/records/);
  // 此測試只是揭露現況，不代表重試安全；需先建立伺服器唯一限制。
  assert.doesNotMatch(sync, /idempotency[_-]key|unique_hand_key/);
});

test('連續調整台數只保留最後一次排程，且取消後不會記錄', () => {
  let nextId=0, saved=0;
  const timers=new Map();
  const ctx={
    V186_AUTO_SCORE_ENABLED:true,handSaveInProgress:false,
    v186AutoScoreTimer:null,
    canAutoRecordCurrentHand:()=>true,
    saveHand:()=>{saved++},
    setTimeout:(fn)=>{const id=++nextId;timers.set(id,fn);return id},
    clearTimeout:(id)=>timers.delete(id)
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186CancelAutoScore')+'\n'+extractFunction('v186ScheduleAutoScore'),ctx);
  ctx.v186ScheduleAutoScore();
  ctx.v186ScheduleAutoScore();
  ctx.v186ScheduleAutoScore();
  assert.equal(timers.size,1,'rapid taps should leave only one pending timer');
  ctx.v186CancelAutoScore();
  assert.equal(timers.size,0);
  assert.equal(saved,0);
});
test('計分排程必須在觸發時重新檢查選擇狀態', () => {
  let callback,valid=true,saved=0;
  const ctx={
    V186_AUTO_SCORE_ENABLED:true,handSaveInProgress:false,
    v186AutoScoreTimer:null,
    canAutoRecordCurrentHand:()=>valid,
    saveHand:()=>{saved++},
    setTimeout:(fn)=>{callback=fn;return 1},
    clearTimeout:()=>{}
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186CancelAutoScore')+'\n'+extractFunction('v186ScheduleAutoScore'),ctx);
  ctx.v186ScheduleAutoScore();
  valid=false;
  callback();
  assert.equal(saved,0,'invalidated selection must not save');
});

test('V186 預覽站阻擋 PocketBase 寫入，正式站允許原有操作', () => {
  const fn=extractFunction('v186MayWritePocketBase');
  function allowed(host) {
    const ctx={location:{hostname:host}};
    vm.createContext(ctx);
    vm.runInContext(fn,ctx);
    return vm.runInContext('v186MayWritePocketBase()',ctx);
  }
  assert.equal(allowed('mahjong-v2.vercel.app'),true);
  assert.equal(allowed('mahjongbattle.app'),true);
  assert.equal(allowed('mahjong-v2-rddzdynqk-4wh2kxwstk-3079.vercel.app'),false);
  assert.equal(allowed('mahjong-v2-git-fix-auto-score-idempotenc-4edb58-4wh2kxwstk-3079.vercel.app'),false);
  assert.equal(allowed('localhost'),false);
});
test('PocketBase API 寫入保護必須在發送 fetch 前執行', () => {
  const source=html.slice(html.indexOf('async function pbRequest('),html.indexOf('async function pbRequest(')+900);
  assert.match(source,/method!=='GET' && method!=='HEAD' && !previewLoginOnly && !v186MayWritePocketBase\(\)/);
  assert.match(source,/auth-with-password/);
  assert.ok(source.indexOf('!v186MayWritePocketBase()') < source.indexOf('await fetch('));
});

test('預覽版實際拒絕 POST/PATCH/DELETE，且完全不呼叫 fetch', async () => {
  let requests=0;
  const ctx={
    location:{hostname:'preview-example.vercel.app'},
    PB_BASE_URL:'https://api.mahjongbattle.app',
    pbAuth:null,
    fetch:async()=>{requests++;return {ok:true,json:async()=>({})}}
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186MayWritePocketBase')+'\n'+extractFunction('pbRequest'),ctx);
  for(const method of ['POST','PATCH','DELETE','PUT']){
    await assert.rejects(ctx.pbRequest('/api/collections/game_hands/records',{method}),/唯讀模式/);
  }
  assert.equal(requests,0);
});
test('預覽版只放行指定登入 POST，不放行其他 auth POST', async () => {
  let requests=0;
  const ctx={
    location:{hostname:'preview-example.vercel.app'},
    PB_BASE_URL:'https://api.mahjongbattle.app',
    pbAuth:null,
    fetch:async()=>{requests++;return {ok:true,json:async()=>({token:'test'})}}
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186MayWritePocketBase')+'\n'+extractFunction('pbRequest'),ctx);
  await ctx.pbRequest('/api/collections/users/auth-with-password',{method:'POST'});
  assert.equal(requests,1);
  await assert.rejects(ctx.pbRequest('/api/collections/users/records',{method:'POST'}),/唯讀模式/);
  assert.equal(requests,1);
});

test('V186 每把牌有固定 PocketBase ID，且寫入失敗時先讀回核對', async () => {
  let writes=0,reads=0;
  const payload={id:'abcdefghijklmno',session:'session1',hand_number:3,result:'win',winner:'p1',discarder:'p2',tai:2};
  const ctx={pbRequest:async(path,options)=>{
    if(options?.method==='POST'){writes++;throw new Error('timeout')}
    reads++;return {...payload};
  },encodeURIComponent};
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186RemoteHandMatches')+'\n'+extractFunction('v186CreateOrVerifyHand'),ctx);
  const outcome=await ctx.v186CreateOrVerifyHand(payload);
  assert.equal(outcome.ok,true);
  assert.equal(outcome.alreadyExists,true);
  assert.equal(writes,1);
  assert.equal(reads,1);
});
test('V186 讀回資料不一致時禁止視為成功', async () => {
  const payload={id:'abcdefghijklmno',session:'session1',hand_number:3,result:'win',winner:'p1',discarder:'p2',tai:2};
  const ctx={pbRequest:async(path,options)=>{
    if(options?.method==='POST')throw new Error('timeout');
    return {...payload,hand_number:4};
  },encodeURIComponent};
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186RemoteHandMatches')+'\n'+extractFunction('v186CreateOrVerifyHand'),ctx);
  const outcome=await ctx.v186CreateOrVerifyHand(payload);
  assert.equal(outcome.ok,false);
  assert.equal(outcome.reason,'remote_hand_conflict');
});
test('V186 讀回也失敗時保留未確認狀態，不用新 ID 盲目重送', async () => {
  const ctx={pbRequest:async()=>{throw new Error('offline')},encodeURIComponent};
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186RemoteHandMatches')+'\n'+extractFunction('v186CreateOrVerifyHand'),ctx);
  const outcome=await ctx.v186CreateOrVerifyHand({id:'abcdefghijklmno'});
  assert.equal(outcome.ok,false);
  assert.equal(outcome.reason,'remote_hand_unconfirmed');
});
test('V186 牌局寫入使用本機固定 record ID', () => {
  const sync=extractFunction('syncRemoteConfirmedHand');
  const save=extractFunction('saveHand');
  assert.match(sync,/id:hand\.v186RecordId/);
  assert.match(sync,/v186CreateOrVerifyHand\(payload\)/);
  assert.match(save,/hand\.v186RecordId=v186CreateHandRecordId\(\)/);
});

test('V186 待同步牌局先保存，且不得覆蓋相同 ID 的不同資料', () => {
  const data=new Map();
  const ctx={V186_PENDING_HANDS_KEY:'mahjongV186PendingHandsV1',localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},Date,JSON};
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186ReadPendingHands')+'\n'+extractFunction('v186RememberPendingHand'),ctx);
  const payload={id:'abcdefghijklmno',session:'session1',hand_number:1};
  ctx.v186RememberPendingHand(payload);
  assert.equal(JSON.parse(data.get('mahjongV186PendingHandsV1'))[payload.id].status,'unconfirmed');
  assert.throws(()=>ctx.v186RememberPendingHand({...payload,hand_number:2}),/衝突/);
});
test('V186 只有 session 同步成功後才清除待同步牌局', () => {
  const sync=extractFunction('syncRemoteConfirmedHand');
  assert.ok(sync.indexOf('v186RememberPendingHand(payload,committedSnapshot)')<sync.indexOf('v186CreateOrVerifyHand(payload)'));
  assert.ok(sync.indexOf('v186ForgetConfirmedHand(payload.id)')>sync.indexOf('game_sessions/records/'));
});

test('V186 恢復核對：即使 session 進度已前進仍須保留 pending 待快照驗證',async()=>{
  const payload={id:'abcdefghijklmno',session:'session1',hand_number:3,result:'win',winner:'p1',discarder:'p2',tai:2};
  let forgotten=[];
  const ctx={
    v186ReadPendingHands:()=>({[payload.id]:{payload}}),
    v186RemoteHandMatches:(record,p)=>record.id===p.id,
    v186PendingSnapshotMatches:()=>false,
    v186ForgetConfirmedHand:id=>forgotten.push(id),
    pbRequest:async path=>path.includes('game_hands')?payload:{hand_number:4},
    encodeURIComponent,Object
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186AuditPendingHands'),ctx);
  const report=await ctx.v186AuditPendingHands();
  assert.equal(report.unconfirmed.length,1);
  assert.deepEqual(forgotten,[]);
});
test('V186 恢復核對：session 尚未更新不可清除 pending',async()=>{
  const payload={id:'abcdefghijklmno',session:'session1',hand_number:3};
  let forgotten=0;
  const ctx={
    v186ReadPendingHands:()=>({[payload.id]:{payload}}),
    v186RemoteHandMatches:()=>true,
    v186PendingSnapshotMatches:()=>false,
    v186ForgetConfirmedHand:()=>forgotten++,
    pbRequest:async path=>path.includes('game_hands')?payload:{hand_number:3},
    encodeURIComponent,Object
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction('v186AuditPendingHands'),ctx);
  const report=await ctx.v186AuditPendingHands();
  assert.equal(report.unconfirmed.length,1);
  assert.equal(forgotten,0);
});

test('V186 快照核對：金額矩陣一致且場次進度相符才能結案',()=>{
  const ctx={};vm.createContext(ctx);
  vm.runInContext(extractFunction('v186PendingSnapshotMatches'),ctx);
  const expected={nextHandNumber:4,cashflowSnapshot:{B:{A:100},A:{B:-100}}};
  assert.equal(ctx.v186PendingSnapshotMatches({hand_number:4,seat_map:{_series_cashflow_snapshot:{A:{B:-100},B:{A:100}}}},expected),true);
  assert.equal(ctx.v186PendingSnapshotMatches({hand_number:5,seat_map:{_series_cashflow_snapshot:expected.cashflowSnapshot}},expected),false);
  assert.equal(ctx.v186PendingSnapshotMatches({hand_number:4,seat_map:{_series_cashflow_snapshot:{A:{B:0}}}},expected),false);
  assert.equal(ctx.v186PendingSnapshotMatches({hand_number:4},expected),false);
});
test('V186 核對成功後才清除待同步牌局',async()=>{
  const payload={id:'abcdefghijklmno',session:'session1',hand_number:3};
  const expectedSnapshot={nextHandNumber:4,cashflowSnapshot:{A:{B:100}}};
  const forgotten=[];
  const ctx={
    v186ReadPendingHands:()=>({[payload.id]:{payload,expectedSnapshot}}),
    v186RemoteHandMatches:()=>true,
    v186PendingSnapshotMatches:()=>true,
    v186ForgetConfirmedHand:id=>forgotten.push(id),
    pbRequest:async path=>path.includes('game_hands')?payload:{hand_number:4},
    encodeURIComponent,Object
  };
  vm.createContext(ctx);vm.runInContext(extractFunction('v186AuditPendingHands'),ctx);
  const report=await ctx.v186AuditPendingHands();
  assert.equal(report.confirmed.length,1);
  assert.deepEqual(forgotten,[payload.id]);
});

test('讀回核對涵蓋金額、莊家、台型與記錄者，物件欄位順序不影響',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(extractFunction('v186RemoteHandMatches'),ctx);
  const payload={id:'abcdefghijklmno',session:'s1',hand_number:1,tai:0,dealer_repeats:2,
    payments:{A:100,B:-100},balances_after:{A:100,B:-100},patterns:['平胡'],dealer:'p1',recorded_by:'u1',recorded_at:'2026-11-12T08:00:00.000Z'};
  assert.equal(ctx.v186RemoteHandMatches({...payload,payments:{B:-100,A:100},recorded_at:'2026-11-12 08:00:00.000Z'},payload),true);
  for(const key of ['id','dealer','recorded_by','patterns','payments','balances_after','recorded_at']) {
    assert.equal(ctx.v186RemoteHandMatches({...payload,[key]:key==='payments'?{A:200,B:-200}:'different'},payload),false,key);
  }
});
test('損壞或錯誤型別的佇列必須保留原文並阻止覆寫',()=>{
  for(const raw of ['{bad','[]','null','42']) {
    let stored=raw;
    const ctx={V186_PENDING_HANDS_KEY:'mahjongV186PendingHandsV1',localStorage:{getItem:()=>stored,setItem:(k,v)=>{stored=v}}};
    vm.createContext(ctx);vm.runInContext(extractFunction('v186ReadPendingHands')+'\n'+extractFunction('v186RememberPendingHand'),ctx);
    assert.throws(()=>ctx.v186RememberPendingHand({id:'abcdefghijklmno',session:'s1'}),/資料損壞/);
    assert.equal(stored,raw);
  }
});
test('本頁遠端操作依序完成；失敗不會永久卡住佇列',async()=>{
  let release;const gate=new Promise(r=>{release=r});const order=[];
  const ctx={v186RemoteSyncQueue:Promise.resolve()};vm.createContext(ctx);vm.runInContext(extractFunction('v186EnqueueRemoteHand'),ctx);
  const first=ctx.v186EnqueueRemoteHand(async()=>{order.push(1);await gate;order.push(2);throw Error('offline')});
  const rejection=assert.rejects(first,/offline/);
  const second=ctx.v186EnqueueRemoteHand(async()=>order.push(3));
  await Promise.resolve();assert.deepEqual(order,[1]);release();await rejection;await second;
  assert.deepEqual(order,[1,2,3]);
});
function syncHarness(failure='') {
  const storage=new Map(), records=new Map(),calls=[];
  let session={hand_number:1},offline=failure==='offline';
  const ctx={remoteSessionId:'s1',currentRoomId:'r1',pbAuth:{record:{id:'u1'}},remoteRoomPlayerMap:{A:{id:'a'},B:{id:'b'}},
    v186RemoteSyncQueue:Promise.resolve(),V186_PENDING_HANDS_KEY:'mahjongV186PendingHandsV1',
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
    hands:[],balances:{},dealer:'A',roundIndex:0,repeats:0,getRoundName:()=> '東1',buildSeatMap:()=>({}),
    console:{warn(){}},pbRequest:async(path,options={})=>{
      calls.push([path,options.method||'GET']);if(offline)throw Error('offline');
      if(path.includes('game_hands')){
        if(options.method==='POST') {const p=JSON.parse(options.body);if(records.has(p.id)) throw Error('duplicate');records.set(p.id,p);if(failure==='lost-response')throw Error('timeout');return p}
        if(!records.has(path.split('/').pop()))throw Object.assign(Error('missing'),{status:404});
        return records.get(path.split('/').pop());
      }
      if(options.method==='PATCH') {if(failure==='patch')throw Error('patch failed');session=JSON.parse(options.body)}
      if(failure==='mismatch')return {...session,hand_number:999};return session;
    }};
  vm.createContext(ctx);
  for(const name of ['v186ReadPendingHands','v186RememberPendingHand','v186ForgetConfirmedHand','v186RemoteHandMatches','v186PendingSnapshotMatches','v186CreateOrVerifyHand','v186AuditPendingHands','v186EnqueueRemoteHand','syncRemoteConfirmedHand']) vm.runInContext(extractFunction(name),ctx);
  const hand={v186RecordId:'abcdefghijklmno',v186RecordedAt:'2026-11-12T08:00:00.000Z',winner:'A',discarder:'B',dealer:'A',result:'胡牌',tai:1,changes:{A:120,B:-120}};
  const snapshot={handNumber:1,balancesAfter:{A:120,B:-120},nextDealer:'B',nextRound:'東2',nextRepeats:0,nextHandNumber:2,cashflowSnapshot:{A:{B:120}}};
  return {ctx,storage,records,calls,hand,snapshot,reconnect:()=>{offline=false}};
}
for(const failure of ['','lost-response','offline','patch','mismatch']) test('完整同步故障注入：'+(failure||'正常成功'),async()=>{
  const h=syncHarness(failure);const outcome=await h.ctx.syncRemoteConfirmedHand(h.hand,h.snapshot);
  const pending=h.ctx.v186ReadPendingHands();
  assert.equal(outcome.ok,['','lost-response'].includes(failure));
  assert.equal(Object.keys(pending).length,outcome.ok?0:1);
  assert.equal(h.records.size,failure==='offline'?0:1);
  if(failure==='offline') {
    h.reconnect();assert.equal((await h.ctx.syncRemoteConfirmedHand(h.hand,h.snapshot)).ok,true);
    assert.equal(h.records.size,1);assert.equal(Object.keys(h.ctx.v186ReadPendingHands()).length,0);
  }
});
test('未確認前一把阻止後續遠端快照跨過；兩把仍保留',async()=>{
  const h=syncHarness('patch');await h.ctx.syncRemoteConfirmedHand(h.hand,h.snapshot);
  const outcome=await h.ctx.syncRemoteConfirmedHand({...h.hand,v186RecordId:'abcdefghijklmnp'},{...h.snapshot,handNumber:2,nextHandNumber:3});
  assert.equal(outcome.reason,'earlier_hand_unconfirmed');assert.equal(h.records.size,1);
  assert.equal(Object.keys(h.ctx.v186ReadPendingHands()).length,2);
});
test('佇列等待中切換房間不能把原牌局寫進新 session',async()=>{
  const h=syncHarness();let release;h.ctx.v186RemoteSyncQueue=new Promise(r=>{release=r});
  const result=h.ctx.syncRemoteConfirmedHand(h.hand,h.snapshot);
  h.ctx.remoteSessionId='s2';h.ctx.currentRoomId='r2';h.hand.tai=99;h.snapshot.balancesAfter.A=999;release();
  assert.equal((await result).ok,true);const record=[...h.records.values()][0];
  assert.equal(record.session,'s1');assert.equal(record.tai,1);assert.equal(record.balances_after.A,120);
  assert.ok(h.calls.every(([path])=>!path.endsWith('/s2')));
});
test('登出或更換記錄者後不得送出等待中的牌局',async()=>{
  const h=syncHarness();let release;h.ctx.v186RemoteSyncQueue=new Promise(r=>{release=r});
  const result=h.ctx.syncRemoteConfirmedHand(h.hand,h.snapshot);h.ctx.pbAuth=null;release();
  assert.equal((await result).reason,'recorder_changed');assert.equal(h.calls.length,0);
});

test('心跳不得覆寫計分進度',()=>{
  assert.doesNotMatch(extractFunction('v32StartRecorderHeartbeat'),/hand_number/);
});
for(const result of ['胡牌','自摸','流局','詐胡']) test('既有付款規則：'+result,()=>{
  const ctx={P:['A','B','C','D'],dealer:'A',winner:'B',discarder:'C',tai:2,repeats:1,result,currentRule:{base:100,tai:20},fraudTai:{A:0,C:1,D:2}};
  vm.createContext(ctx);
  for(const name of ['getDealerBonusTai','amountForTai','amountForTaiWithDealer','normalAmount','dealerAmount','calculateHandPayments'])vm.runInContext(extractFunction(name),ctx);
  const actual=JSON.parse(JSON.stringify(ctx.calculateHandPayments()));
  const expected={'胡牌':{A:0,B:140,C:-140,D:0},'自摸':{A:-200,B:480,C:-140,D:-140},'流局':{A:0,B:0,C:0,D:0},'詐胡':{A:160,B:-420,C:120,D:140}}[result];
  assert.deepEqual(actual,expected);assert.equal(Object.values(actual).reduce((a,b)=>a+b,0),0);
});
