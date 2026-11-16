import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../.github/', import.meta.url));

function yamlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? yamlFiles(path) : /\.ya?ml$/.test(entry.name) ? [path] : [];
  });
}

function isPinned(reference) {
  return reference.startsWith('./') || /^[^@]+@[a-f0-9]{40}$/.test(reference);
}

test('rejects mutable tags, branches, and abbreviated action commit references', () => {
  for (const reference of ['vendor/action@v3', 'vendor/action@main', 'vendor/action@7237c0f']) {
    assert.equal(isPinned(reference), false, reference);
  }
  assert.equal(isPinned(`vendor/action@${'a'.repeat(40)}`), true);
  assert.equal(isPinned('./.github/actions/local'), true);
});

test('all external workflow and composite action uses are pinned to full commit SHAs', () => {
  let checked = 0;
  for (const path of yamlFiles(root)) {
    for (const [index, line] of readFileSync(path, 'utf8').split(/\r?\n/).entries()) {
      const match = line.match(/^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)/);
      if (!match) continue;
      checked++;
      assert.ok(isPinned(match[1]), `${path}:${index + 1}: unpinned action ${match[1]}`);
    }
  }
  assert.ok(checked > 0, 'No action references were checked');
});
