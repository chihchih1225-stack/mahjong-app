const fs=require('node:fs');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
assert.ok(scripts.length>0,'inline scripts found');
for(let i=0;i<scripts.length;i++){
  const result=spawnSync(process.execPath,['--check','-'],{input:scripts[i],encoding:'utf8'});
  assert.equal(result.status,0,'inline script '+(i+1)+' syntax: '+result.stderr);
}
assert.match(html,/function v183ConfirmNextMatch\(keepPlayers=false\)/);
assert.match(html,/const nextPlayers=keepPlayers\?\[\.\.\.P\]:P\.map/);
assert.match(html,/onclick="v183ConfirmNextMatch\(true\)"/);
assert.match(html,/if\(!sessionSaved\)\{alert\('請先完成上一將結案。'\);return\}/);
assert.match(html,/id="v185-live-projection-hotfix"/);
assert.match(html,/#game\.projection-mode:not\(\.hidden\) #playerStats\{display:grid!important/);
assert.match(html,/id="v185-projection-seats-fix2"/);
assert.match(html,/#playerStats :is\(\.player-card,\.viewer-player-card\)/);
assert.match(html,/function v32ViewerStatsHtml\(\)/);
console.log('PASS: '+scripts.length+' inline JS scripts syntax, next-match guards, live/projection CSS markers');
