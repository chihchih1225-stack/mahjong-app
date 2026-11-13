const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function v183ConfirmNextMatch(keepPlayers=false){');
assert.ok(start>=0,'next match function missing');
const end=html.indexOf('\n}\n',start);
assert.ok(end>start,'next match function end missing');
const run=new Function('env','with(env){'+html.slice(start,end+2)+';return v183ConfirmNextMatch;}');
function scenario(swap,fail){
  const e={sessionSaved:true,P:['A','B','C','D'],balances:{A:100,B:-100,C:0,D:0},sessionOpeningBalances:{},seriesCashflowBase:{},seriesCashflowLedger:{A:{B:100}},hands:[{result:'胡牌'}],roundIndex:15,repeats:0,dealer:'A',dealerSeatIndex:0,recorderPlayer:'B',tai:2,winner:'A',discarder:'B',result:'胡牌',fraudTai:{},selectedPatterns:[],roundLeaders:[],seats:['A','B','C','D'],drawPool:[],drawTurn:0,drawAssignments:{},drawOrder:[],gameStartedAt:'x',gameEndedAt:'y',preferredNextTableNumber:0,currentTableNumber:1,remoteSessionId:'r',remoteSessionCreatePromise:null,remoteSessionClosingRequested:false,liveCashflowSnapshot:null,currentRoomId:'r1',appData:{rooms:[{id:'r1'}]},ACTIVE_GAME_KEY:'active',document:{getElementById:id=>({value:id==='nextMatchLeaving'?'A':'E',innerHTML:'',classList:{add(){}}})},localStorage:{setItem(){if(fail)throw Error('quota exceeded')}},alert(){},console:{error(){}},Number,JSON,Set,Object,Array,ensureRoomMembers(){e.membersUpdated=true},emptyCashflow:names=>Object.fromEntries(names.map(n=>[n,{}])),buildCashflowMatrix(){return {}},activeGameSnapshot(){return {P:e.P,balances:e.balances,hands:e.hands}},renderResumeGameCard(){},show(v){e.shown=v}};
  run(e)(!swap);
  if(fail){assert.equal(e.sessionSaved,true);assert.equal(e.hands.length,1);assert.equal(e.recorderPlayer,'B');assert.deepEqual(e.P,['A','B','C','D']);assert.equal(e.membersUpdated,undefined);assert.equal(e.shown,undefined);}
  else{assert.equal(e.sessionSaved,false);assert.equal(e.hands.length,0);assert.equal(e.shown,'seat');assert.deepEqual(e.P,swap?['E','B','C','D']:['A','B','C','D']);}
  assert.equal(e.balances.A,100);assert.equal(e.balances.B,-100);
}
for(const swap of [false,true])for(const fail of [false,true])scenario(swap,fail);
console.log('V185 next-match four simulated scenarios PASS');
