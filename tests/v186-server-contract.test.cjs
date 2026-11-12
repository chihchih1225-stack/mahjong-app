// SQLite index contract only. This is NOT a PocketBase integration test.
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
test('唯一索引草案：跨裝置不同 ID 同把牌被拒；不同 session 合法；既有重複不會被刪除',()=>{
  const result=spawnSync('python3',['-c',`
import sqlite3,sys
sql=open(sys.argv[1]).read()
c=sqlite3.connect(':memory:')
c.execute('CREATE TABLE game_hands(id TEXT PRIMARY KEY, session TEXT, hand_number INTEGER)')
c.executescript(sql)
c.execute("INSERT INTO game_hands VALUES ('device1','s1',1)")
try:
 c.execute("INSERT INTO game_hands VALUES ('device2','s1',1)")
 raise AssertionError('duplicate accepted')
except sqlite3.IntegrityError: pass
c.execute("INSERT INTO game_hands VALUES ('device2','s2',1)")
c.execute('DROP INDEX idx_v186_game_hands_session_number')
c.execute("INSERT INTO game_hands VALUES ('device3','s1',1)")
try:
 c.executescript(sql)
 raise AssertionError('existing duplicates accepted')
except sqlite3.IntegrityError: pass
assert c.execute('SELECT COUNT(*) FROM game_hands').fetchone()[0]==3
`,path.resolve(__dirname,'../docs/pocketbase-review/unique-hand.sql')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
