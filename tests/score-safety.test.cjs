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
assert(html.includes("if(seats.length!==4 || seats.some(p=>!P.includes(p)) || new Set(seats).size!==4){"),'dealer setup rejects duplicate or invalid seats');
assert(html.includes('selectDealer(seats['),'dealer choice uses seat index');

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


const cashScope={
  P:['甲','乙','丙','丁'],hands:[],balances:{甲:0,乙:0,丙:0,丁:0},
  seats:['甲','乙','丙','丁'],seriesCashflowBase:{},seriesCashflowLedger:null,
  liveViewerMode:false,liveCashflowSnapshot:null
};
vm.createContext(cashScope);
const cashFunctions=between('function handCashflowTransfers(hand){','function renderCashflowMatrix(){');
const emptyStart=html.indexOf('function emptyCashflow(');
assert(emptyStart>=0,'cashflow matrix initializer exists');
const emptyEnd=html.indexOf('function handCashflowTransfers(',emptyStart);
vm.runInContext(html.slice(emptyStart,emptyEnd)+cashFunctions,cashScope);
cashScope.hands=[
  {result:'胡牌',winner:'甲',discarder:'乙',changes:{甲:120,乙:-120,丙:0,丁:0}},
  {result:'胡牌',winner:'乙',discarder:'甲',changes:{甲:-40,乙:40,丙:0,丁:0}}
];
const ledger=vm.runInContext('buildCashflowMatrix(hands,P)',cashScope);
assert.equal(ledger['乙']['甲'],120,'乙 paid 甲');
assert.equal(ledger['甲']['乙'],40,'甲 paid 乙');
const signed=(from,to)=>Number(ledger[to]?.[from]||0)-Number(ledger[from]?.[to]||0);
assert.equal(signed('甲','乙'),80,'甲 against 乙 is +80');
assert.equal(signed('乙','甲'),-80,'乙 against 甲 is -80');
assert.equal(signed('甲','乙')+signed('乙','甲'),0,'bilateral net zero sum');
console.log('PASS: bilateral cashflow netting scenario.');
assert(html.includes('rollbackHandFromCashflowLedger(last)'), 'undo updates ATM ledger');
const rollback=between('function rollbackHandFromCashflowLedger(hand){','function renderCashflowMatrix(){');
assert(rollback.includes('seriesCashflowBase=JSON.parse(JSON.stringify(seriesCashflowLedger))'),'undo synchronizes ledger base');
vm.runInContext(rollback,cashScope);
cashScope.seriesCashflowLedger=JSON.parse(JSON.stringify(ledger));
cashScope.seriesCashflowBase=JSON.parse(JSON.stringify(ledger));
vm.runInContext('rollbackHandFromCashflowLedger(hands[1])',cashScope);
assert.equal(cashScope.seriesCashflowLedger['甲']['乙'],0,'undo removes reversed payment');
assert.equal(cashScope.seriesCashflowLedger['乙']['甲'],120,'undo preserves earlier payment');
assert.equal(cashScope.seriesCashflowBase['甲']['乙'],0,'base stays synchronized');
console.log('PASS: undo cashflow rollback preserves prior hands.');
// Repeating the undo must not change the ledger when there is no matching transfer left.
vm.runInContext('rollbackHandFromCashflowLedger(hands[1])',cashScope);
assert.equal(cashScope.seriesCashflowLedger['甲']['乙'],0,'duplicate undo cannot create a negative transfer');
// Undo the remaining hand and confirm the ledger is empty.
vm.runInContext('rollbackHandFromCashflowLedger(hands[0])',cashScope);
assert.equal(cashScope.seriesCashflowLedger['乙']['甲'],0,'undo first hand removes its transfer');
assert.equal(cashScope.seriesCashflowBase['乙']['甲'],0,'base reflects full rollback');
console.log('PASS: duplicate rollback guard and full local cashflow rollback.');



console.log('PASS: static scoring safeguards; remote sync/undo requires integration testing.');
