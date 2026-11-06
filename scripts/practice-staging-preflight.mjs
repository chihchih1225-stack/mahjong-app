#!/usr/bin/env node
/**
 * Practice staging preflight (read-only).
 * Usage: node scripts/practice-staging-preflight.mjs /volume1/docker/mahjong-practice
 * Does NOT build, deploy, restart, or access production databases.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(process.argv[2] || '.');
const compose = join(root, 'compose.yaml');
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const sha256 = data => createHash('sha256').update(data).digest('hex');
let yaml = '';
try {
  yaml = readFileSync(compose, 'utf8');
  check('compose.yaml exists', true, 'SHA256 ' + sha256(yaml));
} catch {
  check('compose.yaml exists', false, 'File not readable');
}
if (yaml) {
  check('POC 7.0 build context', /context:\s*['"]?\.\/mahjong_practice_poc_70\b/.test(yaml));
  check('practice-staging service', /^\s{2}practice-staging:\s*$/m.test(yaml));
  check('loopback port 8787', /127\.0\.0\.1:8787:8787/.test(yaml));
  check('persistent practice volume', /practice_private_data:\/data/.test(yaml));
  check('read-only container', /read_only:\s*true/.test(yaml));
  check('no production API port binding', !/8090:8090/.test(yaml));
}
const source = join(root, 'mahjong_practice_poc_70');
check('POC 7.0 directory exists', existsSync(source) && statSync(source).isDirectory());
for (const name of ['Dockerfile', 'start-staging.mjs', 'multi-room-http.mjs']) {
  check('POC 7.0 ' + name, existsSync(join(source, name)));
}
for (const item of checks) {
  process.stdout.write((item.ok ? 'PASS' : 'FAIL') + ' ' + item.name + (item.detail ? ' (' + item.detail + ')' : '') + '\n');
}
process.stdout.write('\nRead-only preflight only. No image rebuild, network, PB, or Dropbox backup verification performed.\n');
process.exitCode = checks.every(x => x.ok) ? 0 : 1;
