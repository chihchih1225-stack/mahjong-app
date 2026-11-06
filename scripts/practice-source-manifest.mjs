#!/usr/bin/env node
/**
 * Read-only practice staging source inventory.
 * Usage: node scripts/practice-source-manifest.mjs /volume1/docker/mahjong-practice
 * Prints JSON to stdout. Does not expose env values, read volumes, deploy or back up data.
 */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const paths = [
  'compose.yaml',
  'mahjong_practice_poc_70/Dockerfile',
  'mahjong_practice_poc_70/start-staging.mjs',
  'mahjong_practice_poc_70/multi-room-http.mjs'
];
const errors = [];
const files = [];
for (const name of paths) {
  try {
    const file = join(root, name);
    if (lstatSync(file).isSymbolicLink()) throw new Error('symlink is not allowed');
    const real = realpathSync(file);
    const rel = relative(realpathSync(root), real);
    if (rel === '..' || rel.startsWith('..' + sep) || rel.startsWith(sep)) throw new Error('path outside root');
    const data = readFileSync(file);
    files.push({ path: name, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
  } catch (error) {
    errors.push({ path: name, reason: error.code || error.message });
  }
}
const manifest = {
  schema: 'mahjong-practice-source-manifest/v1',
  scope: 'practice-staging-only',
  version: 'UNVERIFIED_NAS_IMAGE',
  generatedAt: new Date().toISOString(),
  files,
  errors,
  checks: {
    sourceInventoryComplete: errors.length === 0,
    nasImageVerified: false,
    practiceDataBackupVerified: false,
    productionPocketBaseBackupVerified: false,
    dropboxUploadVerified: false
  },
  notice: 'File hashes are not a container image digest, a Dropbox upload, or a restorable data backup.'
};
process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
if (errors.length) process.exitCode = 1;
