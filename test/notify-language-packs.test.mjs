import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyLanguagePacks } from '../.github/actions/notify-language-packs/notify.mjs';

const env = { RELEASE_TAG: 'v1.2.0', TEXT_DOMAIN: 'plugin', CATALOG_DIGEST: 'a'.repeat(64) };
const context = { repo: { owner: 'vendor', repo: 'plugin' }, runId: 20, runAttempt: 2 };

function fixture(changes = {}) {
  const calls = [];
  const github = { rest: { repos: {
    getReleaseByTag: async () => ({ data: { id: 12, draft: false, prerelease: false, body: 'Release notes', ...changes } }),
    updateRelease: async args => { calls.push(args); },
  } } };
  return { github, calls };
}

test('updates only the release body and retains visible notes', async () => {
  const { github, calls } = fixture();
  await notifyLanguagePacks(github, context, env);
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0]).sort(), ['body', 'owner', 'release_id', 'repo']);
  assert.equal(calls[0].release_id, 12);
  assert.equal(calls[0].body, `Release notes\n\n<!-- publishpress-locales:plugin:${env.CATALOG_DIGEST}:20:2 -->`);
});

test('replaces the previous hidden marker and permits another delivery attempt', async () => {
  const { github, calls } = fixture({ body: 'Notes\n\n<!-- publishpress-locales:plugin:old:20:1 -->' });
  await notifyLanguagePacks(github, context, env);
  assert.equal(calls[0].body.split('publishpress-locales:').length, 2);
  assert.ok(calls[0].body.startsWith('Notes\n\n'));
  assert.ok(calls[0].body.endsWith(':20:2 -->'));
});

test('does not notify for drafts or pre-releases', async () => {
  for (const change of [{ draft: true }, { prerelease: true }]) {
    const { github, calls } = fixture(change);
    await assert.rejects(notifyLanguagePacks(github, context, env), /published and stable/);
    assert.equal(calls.length, 0);
  }
});

test('invalid publication details cannot edit a release', async () => {
  const { github, calls } = fixture();
  await assert.rejects(notifyLanguagePacks(github, context, { ...env, TEXT_DOMAIN: '../plugin' }), /Invalid/);
  assert.equal(calls.length, 0);
});
