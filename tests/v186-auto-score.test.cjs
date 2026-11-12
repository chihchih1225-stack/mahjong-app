// V186 安全測試：只讀取 HTML 原始碼，不連線 PocketBase、不修改任何牌局。
// 執行：node --test tests/v186-auto-score.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'Missing function ' + name);
  const brace = html.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = brace; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  assert.ok(end > brace, 'Unbalanced function ' + name);
  return html.slice(start, end);
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
  assert.match(sync, /game_hands\/records/);
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
  assert.match(source,/method!=='GET' && method!=='HEAD' && !v186MayWritePocketBase\(\)/);
  assert.ok(source.indexOf('!v186MayWritePocketBase()') < source.indexOf('await fetch('));
});
