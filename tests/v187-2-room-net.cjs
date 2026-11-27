const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const html=fs.readFileSync('index.html','utf8')
const start=html.indexOf('function v147HistoricalHandTransfers(')
const end=html.indexOf('function renderRoomDashboard(',start)
assert.ok(start>=0&&end>start)
const code=html.slice(start,end)
const scenario=String.raw`
const hand=(winner,discarder,amount)=>({result:'胡牌',winner,discarder,changes:{[winner]:amount,[discarder]:-amount}})
const base=[{nets:{'峻祥':-1920,'場主':1920,'三阿姨':0,'阿浩':0},hands:[
  hand('峻祥','場主',2640),hand('場主','峻祥',4560),
  hand('峻祥','三阿姨',320),hand('三阿姨','峻祥',320)
]}]
const data=v147RoomCashflowData(base)
const view=(who,name,d=data)=>roomCashflowOpponentNets(d,who).find(x=>x.name===name)
assert.equal(data.totalFlow,1920)
assert.equal(data.mismatch.length,0)
assert.equal(view('峻祥','場主').net,-1920)
assert.equal(view('場主','峻祥').net,1920)
assert.equal(view('峻祥','場主').won,2640)
assert.equal(view('峻祥','場主').lost,4560)
assert.equal(view('峻祥','三阿姨').net,0)
assert.equal(view('峻祥','阿浩'),undefined)
const legacy=[{nets:{'峻祥':100,'場主':-100},hands:[]}]
const mixed=v147RoomCashflowData(base.concat(legacy))
assert.equal(view('峻祥','場主',mixed).net,-1820)
assert.equal(view('峻祥','場主',mixed).estimated,true)
assert.equal(view('場主','峻祥',mixed).estimated,true)
assert.equal(view('峻祥','三阿姨',mixed).estimated,false)
assert.equal(mixed.mismatch.length,0)
const partial=v147RoomCashflowData([{nets:{'峻祥':480,'場主':-480},hands:[hand('峻祥','場主',300)]}])
assert.equal(view('峻祥','場主',partial).net,480)
assert.equal(view('峻祥','場主',partial).estimated,true)
const malformed=[{nets:{'峻祥':100,'場主':-50},hands:[]}]
assert.ok(v147RoomCashflowData(malformed).mismatch.length>0)
`
const helpers=`
const canonicalPlayerName=s=>s||''
const sessionNets=s=>s.nets
const aggregateSessions=ss=>[...new Set(ss.flatMap(s=>Object.keys(s.nets)))].map(name=>({name}))
const escapeHtml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const roomTimeFilter='all'
`
const node={innerHTML:'',querySelector:()=>null}
const context={assert,console:{warn(){}},document:{getElementById:()=>node,activeElement:null}}
vm.runInNewContext(helpers+code+scenario+String.raw`
v147RenderRoomCashflow(base,'峻祥')
const html=document.getElementById('roomCashflow').innerHTML
assert.match(html,/峻祥<\/b> 的角度/)
assert.match(html,/淨輸 \$1,920/)
assert.match(html,/打平 \$0/)
assert.match(html,/<details class="room-cashflow-details">/)
assert.match(html,/\$2,640/)
assert.match(html,/\$4,560/)
v147RenderRoomCashflow(base.concat(legacy),'峻祥')
assert.match(document.getElementById('roomCashflow').innerHTML,/含推估金額/)
v147RenderRoomCashflow(malformed,'峻祥')
assert.match(document.getElementById('roomCashflow').innerHTML,/金流與結算對不上/)
v147RenderRoomCashflow([],'峻祥')
assert.match(document.getElementById('roomCashflow').innerHTML,/沒有房間金流紀錄/)
`,context)
console.log('PASS room net directions, tie, legacy and partial estimates, mismatch and folded detail')
