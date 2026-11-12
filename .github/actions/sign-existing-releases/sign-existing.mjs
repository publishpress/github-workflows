import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const stableTag = /^v?-?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function planRelease(release) {
  if (release.draft || release.prerelease || !stableTag.test(release.tag_name)) {
    return { status: 'skipped', detail: 'Not a published stable release' };
  }
  const version = release.tag_name.replace(/^v?-?/, '');
  const candidates = release.assets.filter(asset => asset.name.endsWith(`-${version}.zip`) && asset.size > 0);
  if (candidates.length !== 1) {
    return { status: 'failed', detail: 'Expected exactly one non-empty versioned ZIP' };
  }
  const asset = candidates[0];
  if (!/^[A-Za-z0-9._-]+\.zip$/.test(asset.name)) {
    return { status: 'failed', detail: 'Unsupported ZIP filename' };
  }
  if (release.assets.some(item => item.name === `${asset.name}.sig`)) {
    return { status: 'skipped', detail: 'Signature already exists' };
  }
  if (!/^sha256:[a-fA-F0-9]{64}$/.test(asset.digest ?? '')) {
    return { status: 'failed', detail: 'Missing or invalid GitHub SHA-256 digest' };
  }
  return { status: 'ready', asset };
}

export function verifyDigest(bytes, digest) {
  if (`sha256:${createHash('sha256').update(bytes).digest('hex')}` !== digest.toLowerCase()) {
    throw new Error('Downloaded ZIP does not match the GitHub SHA-256 digest');
  }
}

export async function processReleases(releases, sign) {
  const results = [];
  for (const release of releases) {
    const plan = planRelease(release);
    const result = { tag: release.tag_name, ...plan };
    if (plan.status === 'ready') {
      try {
        await sign(release, plan.asset);
        result.status = 'signed';
        result.detail = 'Signature uploaded; original ZIP unchanged';
      } catch {
        result.status = 'failed';
        result.detail = 'Download, digest verification, signing, or upload failed';
      }
    }
    results.push(result);
  }
  return results;
}

function markdown(value) {
  return String(value).replace(/[&<>|\r\n]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '|': '&#124;', '\r': ' ', '\n': ' ' })[char]);
}

async function run() {
  const tag = process.env.RELEASE_TAG;
  if (tag !== 'all' && !stableTag.test(tag ?? '')) throw new Error('Enter an exact stable release tag, or all');
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Invalid repository');
  const gh = (...args) => execFileSync('gh', args, { maxBuffer: 64 * 1024 * 1024 });
  const releases = tag === 'all'
    ? JSON.parse(gh('api', `repos/${repository}/releases?per_page=100`, '--paginate', '--slurp')).flat()
    : [JSON.parse(gh('api', `repos/${repository}/releases/tags/${encodeURIComponent(tag)}`))];
  const signScript = join(dirname(fileURLToPath(import.meta.url)), '..', 'sign-package', 'sign.sh');
  const results = await processReleases(releases, (release, asset) => {
    const directory = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'existing-release-'));
    try {
      console.log(`Signing ${repository} ${release.tag_name} ${asset.name}`);
      const packagePath = join(directory, asset.name);
      const output = openSync(packagePath, 'w');
      try {
        execFileSync('gh', ['api', `repos/${repository}/releases/assets/${asset.id}`, '-H', 'Accept: application/octet-stream'], {
          stdio: ['ignore', output, 'inherit'],
        });
      } finally {
        closeSync(output);
      }
      verifyDigest(readFileSync(packagePath), asset.digest);
      execFileSync('bash', [signScript], {
        env: { ...process.env, PACKAGE_PATH: packagePath, KEY_ID: '' }, stdio: 'inherit',
      });
      // Never clobber an existing signature or upload the original ZIP.
      gh('release', 'upload', release.tag_name, `${packagePath}.sig`, '--repo', repository);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  const lines = ['## Existing Release Signing', '', '| Release | Status | Result |', '| --- | --- | --- |'];
  const icons = { signed: ':white_check_mark:', skipped: ':fast_forward:', failed: ':x:' };
  for (const result of results) {
    const url = `https://github.com/${repository}/releases/tag/${encodeURIComponent(result.tag)}`;
    lines.push(`| [${markdown(result.tag)}](${url}) | ${icons[result.status]} ${result.status} | ${markdown(result.detail)} |`);
    console.log(`${result.tag}: ${result.status} - ${result.detail}`);
  }
  if (results.length === 0) lines.push('| - | skipped | No releases found |');
  lines.push('', 'Download signatures from **Assets** on each linked release page. This workflow does not create Actions artifacts or replace ZIPs.');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  if (results.some(result => result.status === 'failed')) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => {
    console.error('::error::Existing-release signing failed. Check repository access and release selection.');
    process.exitCode = 1;
  });
}
