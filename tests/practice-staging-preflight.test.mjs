import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/practice-staging-preflight.mjs');
const baseCompose = `services:
  practice-staging:
    build:
      context: ./mahjong_practice_poc_70
    ports:
      - "127.0.0.1:8787:8787"
    volumes:
      - practice_private_data:/data
    read_only: true
volumes:
  practice_private_data:
`;
function fixture(compose, files = ['Dockerfile', 'start-staging.mjs', 'multi-room-http.mjs']) {
  const dir = mkdtempSync(join(tmpdir(), 'practice-preflight-'));
  const src = join(dir, 'mahjong_practice_poc_70');
  mkdirSync(src);
  writeFileSync(join(dir, 'compose.yaml'), compose);
  for (const file of files) writeFileSync(join(src, file), '// fixture');
  return dir;
}
function run(dir) { return spawnSync(process.execPath, [script, dir], { encoding: 'utf8' }); }

test('accepts valid isolated staging layout', t => {
  const dir = fixture(baseCompose); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run(dir); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS POC 7\.0 build context/);
});
test('rejects missing POC entrypoint', t => {
  const dir = fixture(baseCompose, ['Dockerfile', 'start-staging.mjs']); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run(dir); assert.equal(r.status, 1); assert.match(r.stdout, /FAIL POC 7\.0 multi-room-http.mjs/);
});
test('rejects port exposed on all interfaces', t => {
  const dir = fixture(baseCompose.replace('127.0.0.1:8787:8787', '0.0.0.0:8787:8787'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run(dir); assert.equal(r.status, 1); assert.match(r.stdout, /FAIL loopback port 8787/);
});
test('rejects production API port mapping', t => {
  const dir = fixture(baseCompose.replace('    ports:', '    ports:\n      - "8090:8090"'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run(dir); assert.equal(r.status, 1); assert.match(r.stdout, /FAIL no production API port binding/);
});
test('rejects wrong source version', t => {
  const dir = fixture(baseCompose.replace('mahjong_practice_poc_70', 'mahjong_practice_poc_69'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = run(dir); assert.equal(r.status, 1); assert.match(r.stdout, /FAIL POC 7\.0 build context/);
});