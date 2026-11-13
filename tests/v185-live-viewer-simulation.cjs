const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function v32ViewerStatsHtml(){');
const end=html.indexOf('function v32RenderViewerDashboard(){',start);
assert.ok(start>=0&&end>start,'Viewer renderer missing');
const fn=new Function('P','hands','seats','balances','winds','dealer','escapeHtml',html.slice(start,end)+'; return v32ViewerStatsHtml;')(
 ['甲','乙','丙','丁'],
 [{result:'胡牌',winner:'甲',discarder:'乙'},{result:'自摸',winner:'丙'}],
 ['甲','乙','丙','丁'],
 {'甲':120,'乙':-120,'丙':0,'丁':0},
 ['東','南','西','北'],'甲',s=>String(s)
);
const output=fn();
for(const [i,pos] of ['bottom','right','top','left'].entries()){
 const needle='viewer-player-card pos-'+pos;
 assert.equal(output.split(needle).length-1,1,'Missing or duplicate seat '+i+' '+pos);
}
assert.ok(output.indexOf('pos-bottom')<output.indexOf('pos-right'));
assert.ok(output.indexOf('pos-right')<output.indexOf('pos-top'));
assert.ok(output.indexOf('pos-top')<output.indexOf('pos-left'));
assert.match(output,/甲/);
assert.match(output,/胡 1・自摸 0・放槍 0/);
assert.match(output,/胡 0・自摸 0・放槍 1/);
assert.match(output,/胡 0・自摸 1・放槍 0/);
console.log('V185-1 live viewer seat and scoring renderer simulation PASS');
