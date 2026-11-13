const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const must=(s)=>assert.ok(html.includes(s),'Missing: '+s);
// Opening must retain the recorder picker and its required validation.
must('id="recorderChoices"');
must('誰拿手機記錄？');
must("if(!recorderPlayer){");
must("alert('請選擇今天拿手機記錄的人')");
// Same players and swap routes both lead through the existing seat re-selection.
must('v183ConfirmNextMatch(true)');
must('v183ConfirmNextMatch(false)');
must('function v183ConfirmNextMatch(keepPlayers=false)');
must('const nextPlayers=keepPlayers?[...P]:P.map(n=>n===leaving?joining:n)');
must("sessionOpeningBalances[player]=Number(balances[player]||0)");
must("seriesCashflowLedger=JSON.parse(JSON.stringify(expanded))");
must("show('seat')");
// Failed next-match storage must restore the completed game before exiting.
must('const before={');
must('const rollback=()=>{');
must("rollback()\\n    console.error".replace('\\n','\n'));
const matchStart=html.indexOf('function v183ConfirmNextMatch(keepPlayers=false)');
const matchEnd=html.indexOf('\\n}\\n'.replace(/\\n/g,'\n'),matchStart);
const nextMatch=html.slice(matchStart,matchEnd);
assert.ok(nextMatch.indexOf('localStorage.setItem(ACTIVE_GAME_KEY') < nextMatch.indexOf('ensureRoomMembers(room,nextPlayers)'), 'Room membership must change only after storage succeeds');
assert.ok(nextMatch.indexOf('localStorage.setItem(ACTIVE_GAME_KEY') < nextMatch.indexOf("seatResult.innerHTML=''"), 'Seat UI must clear only after storage succeeds');
// Projection viewer cards must be scoped to live-viewer-mode only.
must('projection-mode.live-viewer-mode:not(.hidden) #playerStats .viewer-player-card.pos-top');
must('projection-mode.live-viewer-mode:not(.hidden) #playerStats .viewer-player-card.pos-left');
// No unrelated projection CSS patch should be included in this safe branch.
assert.ok(!html.includes('v185-live-projection-hotfix'));
assert.ok(!html.includes('v185-projection-seats-fix2'));
console.log('V185 static regression guards PASS');

// Preview must never write to the production-connected PocketBase backend.
must("const previewHost=/\\.vercel\\.app$/i.test(location.hostname)");
must("if(previewHost && !['GET','HEAD','OPTIONS'].includes(method))");
