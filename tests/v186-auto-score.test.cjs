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
