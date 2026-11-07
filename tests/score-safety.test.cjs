// Run locally: node tests/score-safety.test.cjs
// Static regression checks only; does not touch PocketBase or production.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,`missing section: ${a}`);return html.slice(i,j)};
assert(!html.includes('onclick="setStake(\'100/50\',this)"'));
assert(!html.includes('onclick="setStake(\'200/50\',this)"'));
assert(html.includes('function startManualSeats()'));
assert(html.includes('function changeManualSeat(index,player)'));
assert(html.includes('function canAutoRecordCurrentHand()'));
const auto=between('function canAutoRecordCurrentHand(){','function saveHand(){');
for(const token of ['handTaiExplicitlySelected','discarder!==winner','result===\'自摸\'']) assert(auto.includes(token));
const cash=between('function renderCashflowMatrix(){','function cashflowReconciles(){');
assert(cash.includes('matrix[to]?.[from]'));
assert(cash.includes('matrix[from]?.[to]'));
assert(cash.includes('對帳異常'));
const sync=between('async function syncRemoteConfirmedHand(hand){','async function completeRemoteSession(');
assert(sync.includes("method:'POST'"));
assert(sync.includes("method:'PATCH'"));
assert(sync.includes('catch(e)')); // Known risk: catch currently swallows sync failures.

const vm=require('node:vm');
const extract=(a,b)=>between(a,b).replace(/\\n$/,'');
const scope={P:['甲','乙','丙','丁'],winner:'',discarder:'',result:'胡牌',tai:0,handTaiExplicitlySelected:false,liveViewerMode:false};
vm.createContext(scope);
vm.runInContext(extract('function canAutoRecordCurrentHand(){','function saveHand(){'),scope);
const can=()=>vm.runInContext('canAutoRecordCurrentHand()',scope);
assert.equal(can(),false,'no selected tai or winner');
scope.handTaiExplicitlySelected=true;
scope.winner='甲';
scope.discarder='乙';
assert.equal(can(),true,'complete discard win');
scope.discarder='甲';
assert.equal(can(),false,'winner cannot discard to self');
scope.result='自摸';
scope.discarder='';
assert.equal(can(),true,'self draw needs no discarder');
scope.handTaiExplicitlySelected=false;
assert.equal(can(),false,'fresh tai selection required');
scope.handTaiExplicitlySelected=true;
scope.tai=-1;
assert.equal(can(),false,'negative tai rejected');
scope.tai=0;
scope.liveViewerMode=true;
assert.equal(can(),false,'viewer cannot auto record');
console.log('PASS: auto-record completeness scenarios.');

console.log('PASS: static scoring safeguards; remote sync/undo requires integration testing.');
