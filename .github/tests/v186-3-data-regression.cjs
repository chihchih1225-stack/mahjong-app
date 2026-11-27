// Run against the production-shaped HTML with synthetic records only. No server is contacted.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const cut=(a,b)=>{const x=html.indexOf(a),z=html.indexOf(b,x+a.length);assert(x>=0&&z>x,a);return html.slice(x,z)};
const run=(s,g={})=>vm.runInNewContext(s,g);
const plain=x=>JSON.parse(JSON.stringify(x));

for(const [,js] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(js);
new vm.Script(sw);

async function historyTests(){
 const g={URLSearchParams,console:{warn(){}},calls:[],fail:true,fixture:{rooms:[{id:'room',name:'fixture',pocketbase:true}],sessions:[{id:'cached',roomId:'room',hands:[{}]}]}};
 await run(`
 const window={},document={getElementById(){return null}};
 const pbAuth={record:{id:'owner'},token:'test'}, currentRoomId='room', appData=fixture;
 const localStorage={removeItem(){}}, V140_HIDDEN_LEGACY_KEY='unused';
 const ensureAppData=()=>{},persistAppData=()=>true;
 const v37RoomHistoryLoaded=new Set(),v37RoomHistoryLoading=new Map();
 const getCurrentRoomPlayerAccess=async()=>true;
 const pbFilterValue=v=>v, canonicalRoomPlayerName=rp=>rp?.display_name,canonicalPlayerName=v=>v;
 const pbRequest=async path=>{
   calls.push(path);
   const p=new URLSearchParams(path.split('?')[1]),page=Number(p.get('page'));
   const answer=(items,totalPages=1)=>({page,totalPages,items});
   if(path.includes('game_sessions')) return answer([{id:'s'+page,started_at:'2026-11-2'+(4+page)+'T10:00:00Z',hand_number:2,players:[]}],2);
   if(path.includes('room_players'))return answer([]);
   if(page===2&&fail)throw new Error('lost page');
   return answer([{session:'s'+page,hand_number:1,result:'draw'}],2);
 };
 ${cut('async function pbAllRecords(', 'async function syncRoomsFromPocketBase(')}
 ${cut('async function pbHandsBySession(', 'async function v37RefreshCurrentRoomHistory(')}
 (async()=>{
   try{await v37LoadSharedRoomHistory('room',true)}catch(e){globalThis.failed=e.message}
   globalThis.afterFail={ids:appData.sessions.map(x=>x.id),loaded:v37RoomHistoryLoaded.has('room')};
   fail=false;
   await v37LoadSharedRoomHistory('room',true);
   globalThis.afterSuccess=appData.sessions.map(x=>[x.id,x.hands.length]);
 })()
 `,g);
 assert.equal(g.failed,'lost page');
 assert.deepEqual(plain(g.afterFail),{ids:['cached'],loaded:false});
 assert.deepEqual(plain(g.afterSuccess),[['s1',1],['s2',1]]);
 assert(g.calls.some(x=>x.includes('page=2')&&x.includes('game_hands')));
 console.log('PASS history pages and atomic retry');
}

async function syncTests(){
 const g={assert,console,URLSearchParams,crypto:require('node:crypto').webcrypto};
 await run(`
 const window={addEventListener(){}}, document={getElementById(){return null}};
 const pbAuth={record:{id:'u'},token:'test'}, appData={rooms:[{id:'r',pocketbase:true}]};
 const currentRoomId='r', gameStartedAt='2026-11-26T00:00:00Z';
 let remoteSessionId='', currentTableNumber=0, remoteSessionCreatePromise=null,liveViewerMode=false;
 let P=['A','B','C','D'],dealer='A',roundIndex=0,repeats=0,balances={A:0,B:0,C:0,D:0},hands=[];
 let seriesCashflowLedger=null,seriesCashflowBase={};
 const players=Object.fromEntries(P.map(name=>[name,{id:name}]));
 let remoteRoomPlayerMap=players;
 const pbFilterValue=x=>x, getRoundName=()=> '東1',buildSeatMap=()=>({}),buildCashflowMatrix=()=>({});
 const cashflowParticipantNames=order=>order;
 const loadRoomPlayerMap=async()=>players, v32StartRecorderHeartbeat=()=>{};
 let checkpoint, saveAllowed=true;
 function persistActiveGame(){
   if(!saveAllowed)return false
   checkpoint=JSON.parse(JSON.stringify({recorderSync:{owner:recorderSync.owner,sessionId:recorderSync.sessionId,createId:recorderSync.createId,known:recorderSync.known,undo:recorderSync.undo,recover:recorderSync.recover},hands}));return true
 }
 let created=0,writes=0,lastHandNo,lookups=0,denyHand=false,loseReply=false,allowRead=true,matches=[];
 const server=new Map(), session={id:'original',room:'r',recorder:'u',started_at:'2026-11-26 00:00:00.000Z',status:'active'};
 const failed=()=>Object.assign(new Error('request refused'),{status:404});
 const pbAllRecords=async name=>{
   if(name==='game_sessions'){lookups++;return matches}
   return [...server.values()];
 };
 const createRemoteGameSession=async()=>{
   created++;
   assert(checkpoint.recorderSync.createId);
   return {...session,id:checkpoint.recorderSync.createId};
 };
 const pbRequest=async (p,c={})=>{
   const isHand=p.includes('/game_hands/'),id=p.split('/').at(-1);
   if(!isHand){
     if(c.method==='PATCH'){lastHandNo=JSON.parse(c.body).hand_number;return session}
     return {...session,id};
   }
   if(c.method==='POST'){
     const payload=JSON.parse(c.body);writes++;
     if(denyHand)throw new Error('offline')
     assert.equal(checkpoint.hands[payload.hand_number-1].syncId,payload.id);
     if(server.has(payload.id))throw new Error('already written');
     server.set(payload.id,payload);
     if(loseReply)throw new Error('write succeeded but reply lost');
     return payload;
   }
   if(!allowRead)throw new Error('response still offline');
   if(!server.has(id))throw failed();
   if(c.method==='DELETE'){server.delete(id);return }
   return server.get(id);
 };
 ${cut('let recorderSync=null','async function completeRemoteSession(')}
 function hand(n){return {result:'流局',round:'東1',tai:0,dealer:'A',changes:{},syncBalances:{A:n,B:0,C:0,D:0}}}
 (async()=>{
   initRecorderSync();
   hands=[hand(1),hand(2)];
   saveAllowed=false;
   assert.equal(await flushRecorderSync(),false);assert.equal(created,0);
   saveAllowed=true;denyHand=true;
   assert.equal(await flushRecorderSync(),false);assert.equal(created,1);assert.equal(server.size,0);
   assert.equal(lastHandNo,undefined);
   denyHand=false;loseReply=true;allowRead=false;
   assert.equal(await flushRecorderSync(),false);assert.equal(server.size,1);
   const saved=checkpoint;
   const lostId=saved.hands[0].syncId;
   assert(server.has(lostId));
   hands=saved.hands;initRecorderSync(saved);loseReply=false;allowRead=true;
   const n=writes;
   assert.equal(await flushRecorderSync(),true);
   assert.equal(writes,n+1);assert.equal(created,1);assert.equal(server.size,2);assert.equal(lastHandNo,3);
   assert.equal(recorderSync.known[1],lostId);
   const remove=hands.pop();recorderSync.undo.push({n:2,id:remove.syncId});delete recorderSync.known[2];
   const replacement=hand(3);hands.push(replacement);
   assert.equal(await flushRecorderSync(),true);assert.equal(server.size,2);assert(!server.has(remove.syncId));
   assert.equal(server.get(replacement.syncId).hand_number,2);
   assert.equal(await flushRecorderSync(),true);assert.equal(server.size,2);
   // Legacy local checkpoints must find the existing session or stop on ambiguous matches.
   matches=[{...session,id:recorderSync.sessionId}];
   initRecorderSync({hands});assert.equal(await flushRecorderSync(),true);
   assert.equal(lookups,1);assert.equal(created,1);
   assert.equal(recorderSync.sessionId,matches[0].id);
   matches.push({...session,id:'another'});
   initRecorderSync({hands});assert.equal(await flushRecorderSync(),false);
   assert.equal(created,1);
 })()
 `,g);
 console.log('PASS save-before-send, offline retry, reconnect, lost response, undo replacement and ambiguous resume');
}

(async()=>{
 await historyTests();
 await syncTests();
})().catch(e=>{console.error(e);process.exitCode=1});
