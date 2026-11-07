// Safe static regression checks: no network, no PocketBase writes.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function check(name,ok){assert.ok(ok,name);console.log('PASS '+name)}
check('owner can be identified from rooms.owner',html.includes("room?.owner ? room.owner===accountId : membership?.role==='owner'"));
check('owner projection uses three columns',/V171 preview-only projection correction[\s\S]*?grid-template-columns:minmax\(0,37fr\) minmax\(0,27fr\) minmax\(0,36fr\)!important/.test(html));
check('owner projection excludes viewer mode',html.includes('#game.projection-mode:not(.hidden):not(.live-viewer-mode)'));
check('remote room count is read before deletion',html.includes('remoteCount=Number(result.totalItems||0)'));
check('remote room deletion is blocked pending backend verification',/if\(room\.pocketbase\)\{\s*alert\('已確認房間及戰績數量/.test(html));
check('no duplicate deleteCurrentRoom definitions',(html.match(/async function deleteCurrentRoom\(/g)||[]).length===1);
console.log('Static regression checks complete; visual and PocketBase integration tests still required.');
