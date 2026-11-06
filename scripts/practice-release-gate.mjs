#!/usr/bin/env node
/**
 * Practice staging release gate. Reads a manually supplied attestation JSON.
 * No deployment, network, NAS access or backup is performed by this script.
 *
 * Usage: node scripts/practice-release-gate.mjs path/to/attestation.json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.argv[2];
if (!file) {
  process.stderr.write('Missing attestation path\n');
  process.exit(2);
}
let data;
try { data = JSON.parse(readFileSync(resolve(file), 'utf8')); }
catch { process.stderr.write('Cannot read valid JSON attestation\n'); process.exit(2); }
const isSha = v => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
const checks = {
  correctSchema: data.schema === 'mahjong-practice-release-attestation/v1',
  practiceOnly: data.scope === 'practice-staging-only',
  pinnedGitCommit: typeof data.gitCommit === 'string' && /^[a-f0-9]{40}$/i.test(data.gitCommit),
  verifiedSourceHash: isSha(data.sourceManifestSha256),
  verifiedImageDigest: typeof data.imageDigest === 'string' && /^sha256:[a-f0-9]{64}$/i.test(data.imageDigest),
  preflightPassed: data.preflightPassed === true,
  automatedTestsPassed: data.automatedTestsPassed === true,
  practiceDataBackup: data.practiceDataBackup?.verified === true && typeof data.practiceDataBackup?.location === 'string' && data.practiceDataBackup.location.length > 0 && isSha(data.practiceDataBackup.sha256),
  practiceRestoreTested: data.practiceDataBackup?.restoreTested === true,
  dropboxSourceBackup: data.dropboxSourceBackup?.verified === true && typeof data.dropboxSourceBackup?.path === 'string' && data.dropboxSourceBackup.path.startsWith('/6. 誰與爭鋒｜Mahjong PWA/') && isSha(data.dropboxSourceBackup.sha256),
  operatorApproval: data.operatorApproval?.approved === true && typeof data.operatorApproval?.reference === 'string' && data.operatorApproval.reference.trim().length > 0,
  productionUntouched: data.productionUntouched === true
};
for (const [name, pass] of Object.entries(checks)) process.stdout.write(`${pass ? 'PASS' : 'BLOCK'} ${name}\n`);
const passed = Object.values(checks).every(Boolean);
process.stdout.write(passed ? 'Release preconditions reported complete; independent verification still required.\n' : 'Release blocked; no changes made.\n');
process.exitCode = passed ? 0 : 1;
