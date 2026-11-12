import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planRelease, processReleases, verifyDigest } from '../.github/actions/sign-existing-releases/sign-existing.mjs';

const bytes = Buffer.from('original ZIP bytes');
const asset = { id: 1, name: 'plugin-1.2.3.zip', size: bytes.length, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` };
const release = { tag_name: 'v1.2.3', draft: false, prerelease: false, assets: [asset] };

test('accepts one versioned ZIP and normalizes supported tag prefixes', () => {
  for (const tag_name of ['1.2.3', 'v1.2.3', 'v-1.2.3']) {
    assert.equal(planRelease({ ...release, tag_name }).status, 'ready');
  }
});

test('skips drafts, pre-releases, and language-pack tags', () => {
  for (const change of [{ draft: true }, { prerelease: true }, { tag_name: '1.2.3-beta.1' }, { tag_name: 'language-packs' }]) {
    assert.equal(planRelease({ ...release, ...change }).status, 'skipped');
  }
});

test('skips existing signatures without replacing them', () => {
  assert.equal(planRelease({ ...release, assets: [asset, { name: `${asset.name}.sig` }] }).status, 'skipped');
});

test('rejects missing, ambiguous, and empty versioned ZIPs', () => {
  for (const assets of [[], [{ ...asset, name: 'plugin.zip' }], [asset, { ...asset, name: 'other-1.2.3.zip' }], [{ ...asset, size: 0 }]]) {
    assert.equal(planRelease({ ...release, assets }).status, 'failed');
  }
});

test('rejects missing digests and unsafe ZIP names', () => {
  for (const change of [{ digest: null }, { digest: 'sha256:' }, { name: '../plugin-1.2.3.zip' }]) {
    assert.equal(planRelease({ ...release, assets: [{ ...asset, ...change }] }).status, 'failed');
  }
});

test('checks exact bytes against the GitHub SHA-256 digest', () => {
  assert.doesNotThrow(() => verifyDigest(bytes, asset.digest));
  assert.throws(() => verifyDigest(Buffer.from('changed'), asset.digest), /does not match/);
});

test('continues after a signing failure and never signs skipped releases', async () => {
  const signed = [];
  const results = await processReleases([release, { ...release, tag_name: '1.2.3' }, { ...release, draft: true }], item => {
    signed.push(item.tag_name);
    if (item.tag_name === release.tag_name) throw new Error('test failure');
  });
  assert.deepEqual(signed, ['v1.2.3', '1.2.3']);
  assert.deepEqual(results.map(item => item.status), ['failed', 'signed', 'skipped']);
});

test('empty release lists perform no signing', async () => {
  assert.deepEqual(await processReleases([], () => assert.fail('must not sign')), []);
});
