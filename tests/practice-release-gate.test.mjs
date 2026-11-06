import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/practice-release-gate.mjs');
const good = () => ({
  schema: 'mahjong-practice-release-attestation/v1',
  scope: 'practice-staging-only',
  gitCommit: 'a'.repeat(40),
  sourceManifestSha256: 'b'.repeat(64),
  imageDigest: 'sha256:' + 'c'.repeat(64),
  preflightPassed: true,
  automatedTestsPassed: true,
  practiceDataBackup: { verified: true, location: 'isolated-backup-file', sha256: 'd'.repeat(64), restoreTested: true },
  dropboxSourceBackup: { verified: true, path: '/6. 誰與爭鋒｜Mahjong PWA/線上練習局_獨立開發/test.zip', sha256: 'e'.repeat(64) },
  operatorApproval: { approved: true, reference: 'explicit-staging-approval-id' },
  productionUntouched: true
});
function run(t, data) {
  const dir = mkdtempSync(join(tmpdir(), 'practice-release-gate-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'attestation.json');
  writeFileSync(path, JSON.stringify(data));
  return spawnSync(process.execPath, [script, path], { encoding: 'utf8' });
}
test('complete sample attestation is accepted as claims only', t => {
  const r = run(t, good());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /independent verification still required/);
});
test('missing backup blocks release', t => {
  const d = good(); delete d.practiceDataBackup;
  const r = run(t, d);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BLOCK practiceDataBackup/);
});
test('missing restore drill blocks release', t => {
  const d = good(); d.practiceDataBackup.restoreTested = false;
  const r = run(t, d);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BLOCK practiceRestoreTested/);
});
test('no user approval blocks release', t => {
  const d = good(); d.operatorApproval.approved = false;
  const r = run(t, d);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BLOCK operatorApproval/);
});
test('unverified Dropbox copy blocks release', t => {
  const d = good(); d.dropboxSourceBackup.verified = false;
  const r = run(t, d);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BLOCK dropboxSourceBackup/);
});
test('production touched blocks release', t => {
  const d = good(); d.productionUntouched = false;
  const r = run(t, d);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BLOCK productionUntouched/);
});
