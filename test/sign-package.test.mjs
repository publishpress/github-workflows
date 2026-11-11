import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = readFileSync(new URL('../.github/actions/sign-package/sign.sh', import.meta.url), 'utf8');
const bash = process.platform === 'win32' ? 'C:/laragon/bin/git/bin/bash.exe' : 'bash';

for (const owner of ['publishpress', 'MetaSlider']) {
  test(`signs exact bytes for ${owner} with a test-only key`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'sign-package-test-'));
    try {
      const { privateKey, publicKey } = generateKeyPairSync('ed25519');
      const der = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
      // Substitute an ephemeral key in the test copy, never use organization private keys.
      writeFileSync(join(dir, 'sign.sh'), script.replace(/public_key=MCow[^\n]+/g, `public_key=${der}`));
      const bytes = Buffer.from('exact package bytes');
      const packagePath = join(dir, 'plugin-1.0.0.zip');
      writeFileSync(packagePath, bytes);
      const env = {
        ...process.env,
        GITHUB_REPOSITORY_OWNER: owner,
        PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        KEY_ID: '', PACKAGE_PATH: packagePath, RUNNER_TEMP: dir,
        GITHUB_OUTPUT: join(dir, 'outputs'),
      };
      const result = spawnSync(bash, [join(dir, 'sign.sh')], { env, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const line = readFileSync(`${packagePath}.sig`, 'utf8');
      const match = /^v1 ([\w.-]+) ([A-Za-z0-9+/]{86}==)\n$/.exec(line);
      assert.ok(match);
      assert.equal(match[1], `${owner.toLowerCase()}-2026`);
      const signature = Buffer.from(match[2], 'base64');
      assert.equal(verify(null, bytes, publicKey, signature), true);
      assert.equal(verify(null, Buffer.from('changed bytes'), publicKey, signature), false);
      assert.equal(spawnSync(bash, [join(dir, 'sign.sh')], {
        env: { ...env, KEY_ID: 'wrong-key' }, encoding: 'utf8',
      }).status, 1);
      assert.equal(spawnSync(bash, [join(dir, 'sign.sh')], {
        env: { ...env, PRIVATE_KEY: '' }, encoding: 'utf8',
      }).status, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
