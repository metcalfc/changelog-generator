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

test('the bundle resolves changelog.sh through ncc asset relocation', () => {
  const bundle = readFileSync(join(ROOT, 'dist', 'index.js'), 'utf8')

  // index.js builds the script path from `__dirname`. That only resolves in
  // the bundle because ncc's asset relocator rewrites the literal and copies
  // changelog.sh into dist/. If a refactor or an ncc upgrade ever leaves the
  // path un-relocated, the action fails on every run at the exec call, and
  // nothing else in this suite runs the bundle to catch it.
  assert.match(
    bundle,
    /__nccwpck_require__\.ab \+ "changelog\.sh"/,
    'ncc no longer relocates the changelog.sh path'
  )
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
