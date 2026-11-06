import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = resolve('scripts/practice-source-manifest.mjs');
function setup(t, omit = '') {
  const dir = mkdtempSync(join(tmpdir(), 'practice-manifest-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'mahjong_practice_poc_70'));
  const paths = ['compose.yaml', 'mahjong_practice_poc_70/Dockerfile', 'mahjong_practice_poc_70/start-staging.mjs', 'mahjong_practice_poc_70/multi-room-http.mjs'];
  for (const path of paths) if (path !== omit) writeFileSync(join(dir, path), 'fixture:' + path);
  return dir;
}
function run(dir) {
  const result = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
  return { status: result.status, data: JSON.parse(result.stdout), stderr: result.stderr };
}
test('complete inventory reports hashes but no verified backup', t => {
  const result = run(setup(t));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.data.files.length, 4);
  assert.equal(result.data.errors.length, 0);
  assert.equal(result.data.checks.dropboxUploadVerified, false);
  assert.equal(result.data.checks.nasImageVerified, false);
  assert.equal(result.data.checks.practiceDataBackupVerified, false);
  const expected = createHash('sha256').update('fixture:compose.yaml').digest('hex');
  assert.equal(result.data.files[0].sha256, expected);
});
test('missing file fails closed', t => {
  const result = run(setup(t, 'mahjong_practice_poc_70/Dockerfile'));
  assert.equal(result.status, 1);
  assert.equal(result.data.checks.sourceInventoryComplete, false);
  assert.equal(result.data.errors[0].path, 'mahjong_practice_poc_70/Dockerfile');
});
