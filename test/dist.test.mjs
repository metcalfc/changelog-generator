import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ROOT } from './helpers/repo.mjs'

// action.yml runs dist/index.js, not index.js. A stale dist/ is the classic way
// to ship a JavaScript action that silently does the old thing, so the build
// output is checked in and verified here.

test('dist/changelog.sh matches the source script', () => {
  const source = readFileSync(join(ROOT, 'changelog.sh'), 'utf8')
  const shipped = readFileSync(join(ROOT, 'dist', 'changelog.sh'), 'utf8')

  assert.equal(shipped, source, 'run `make build` to refresh dist/')
})

test('dist/changelog.sh is executable', () => {
  const mode = statSync(join(ROOT, 'dist', 'changelog.sh')).mode
  assert.equal(mode & 0o111, 0o111, 'dist/changelog.sh must be executable')
})

test('dist/index.js is an up-to-date build of index.js', t => {
  const out = mkdtempSync(join(tmpdir(), 'changelog-generator-build-'))
  t.after(() => rmSync(out, { recursive: true, force: true }))

  execFileSync('npx', ['ncc', 'build', './index.js', '-o', out], {
    cwd: ROOT,
    encoding: 'utf8'
  })

  const fresh = readFileSync(join(out, 'index.js'), 'utf8')
  const shipped = readFileSync(join(ROOT, 'dist', 'index.js'), 'utf8')

  assert.equal(fresh, shipped, 'run `make build` and commit dist/')
})
