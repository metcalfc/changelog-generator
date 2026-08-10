import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  captureError,
  CHANGELOG_SH,
  commit,
  createRepo,
  createShallowClone,
  isShallow,
  git,
  line,
  runChangelog,
  tag
} from './helpers/repo.mjs'

test('lists the commits between two refs, newest first', t => {
  const dir = createRepo(t)
  const first = commit(dir, 'feat: first')
  tag(dir, 'v0.0.1')
  const second = commit(dir, 'feat: second')
  const third = commit(dir, 'feat: third')
  tag(dir, 'v0.0.2')

  const out = runChangelog(dir, { head: 'v0.0.2', base: 'v0.0.1' })

  assert.deepEqual(out.split('\n'), [line(third), line(second)])
  assert.ok(!out.includes(first.sha), 'base ref commit must not be included')
})

test('reverse=true lists the commits oldest first', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: first')
  tag(dir, 'v0.0.1')
  const second = commit(dir, 'feat: second')
  const third = commit(dir, 'feat: third')
  tag(dir, 'v0.0.2')

  const out = runChangelog(dir, {
    head: 'v0.0.2',
    base: 'v0.0.1',
    reverse: 'true'
  })

  assert.deepEqual(out.split('\n'), [line(second), line(third)])
})

test('reverse=false keeps the default newest-first order', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: first')
  tag(dir, 'v0.0.1')
  const second = commit(dir, 'feat: second')
  const third = commit(dir, 'feat: third')
  tag(dir, 'v0.0.2')

  // Assert the order outright. Comparing this against a run that omits
  // `reverse` proves nothing, because omitting it just takes the same
  // 'false' the helper passes by default.
  const out = runChangelog(dir, {
    head: 'v0.0.2',
    base: 'v0.0.1',
    reverse: 'false'
  })

  assert.deepEqual(out.split('\n'), [line(third), line(second)])
})

test('formats every commit as a markdown link to the commit URL', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(dir, 'fix: something broke')

  const out = runChangelog(dir, {
    head: 'HEAD',
    base: 'base',
    repo: 'octocat/hello-world'
  })

  assert.equal(
    out,
    `- [${head.short}](http://github.com/octocat/hello-world/commit/${head.sha}) - fix: something broke`
  )
})

test('an empty base ref falls back to the initial commit', t => {
  const dir = createRepo(t)
  const first = commit(dir, 'feat: first')
  const second = commit(dir, 'feat: second')

  const out = runChangelog(dir, { head: 'HEAD', base: '' })

  // The initial commit is the fallback base, so it is excluded from its own
  // range: everything after it shows up.
  assert.deepEqual(out.split('\n'), [line(second)])
  assert.ok(!out.includes(first.sha))
})

test('an empty base ref on a single-commit repo reports no changes', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: the only commit')

  assert.equal(runChangelog(dir, { head: 'HEAD', base: '' }), 'No Changes.')
})

test('identical refs report no changes instead of failing', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: first')
  tag(dir, 'v0.0.1')

  assert.equal(
    runChangelog(dir, { head: 'v0.0.1', base: 'v0.0.1' }),
    'No Changes.'
  )
})

test('handles branch names containing slashes', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'v1.0.0')
  git(dir, ['checkout', '--quiet', '-b', 'test/branch'])
  const onBranch = commit(dir, 'feat: work on a slashed branch')

  const out = runChangelog(dir, { head: 'test/branch', base: 'v1.0.0' })

  assert.equal(out, line(onBranch))
})

test('passes commit subjects through without shell interpretation', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const subjects = [
    'fix: escape 100% of "quotes" and \'apostrophes\'',
    'feat: support $HOME and *.txt globs',
    'chore: a && b || c; d',
    'docs: backticks `like this` and $(this)',
    'refactor: unicode ✨ and emoji 🚀'
  ]
  const commits = subjects.map(s => commit(dir, s))

  const out = runChangelog(dir, { head: 'HEAD', base: 'base' })

  assert.deepEqual(
    out.split('\n'),
    commits.reverse().map(c => line(c))
  )
})

test('reports only the subject line of a multi-line commit message', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(dir, 'feat: subject only', 'A body that must not appear.')

  const out = runChangelog(dir, { head: 'HEAD', base: 'base' })

  assert.equal(out, line(head))
  assert.ok(!out.includes('must not appear'))
})

test('fails loudly when a ref does not exist', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: first')

  const err = captureError(() =>
    runChangelog(dir, { head: 'no-such-ref', base: 'HEAD' })
  )
  assert.notEqual(err.status, 0)
  assert.match(String(err.stderr), /no-such-ref/)
})

test('does not touch the network when fetch is false', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(dir, 'feat: offline')
  // A remote that cannot possibly resolve: if changelog.sh fetched anyway the
  // `set -e` at the top of the script would abort the run.
  git(dir, [
    'remote',
    'add',
    'origin',
    'https://0.0.0.0/metcalfc/changelog-generator.git'
  ])

  const out = runChangelog(dir, { head: 'HEAD', base: 'base', fetch: 'false' })

  assert.equal(out, line(head))
})

test('exits non-zero when required arguments are missing', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: first')

  // `set -u` means a missing positional argument must abort rather than
  // silently produce a changelog against the wrong range.
  const err = captureError(() =>
    execFileSync(CHANGELOG_SH, ['HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  )
  assert.notEqual(err.status, 0)
})

test('fetch=true deepens a shallow checkout and picks up its tags', t => {
  const origin = createRepo(t)
  const first = commit(origin, 'feat: first')
  tag(origin, 'v0.0.1')
  const second = commit(origin, 'feat: second')
  const third = commit(origin, 'feat: third')
  tag(origin, 'v0.0.2')

  const dir = createShallowClone(t, origin)
  assert.ok(isShallow(dir), 'fixture must start shallow, like actions/checkout')
  assert.ok(
    !existsSync(join(dir, '.git', 'refs', 'tags', 'v0.0.1')),
    'fixture must start without the tags the changelog needs'
  )

  // Chaining --depth=1 fetches ahead of --unshallow used to abort here with
  // "shallow file has changed since we read it", intermittently.
  const out = runChangelog(dir, {
    head: 'v0.0.2',
    base: 'v0.0.1',
    fetch: 'true'
  })

  assert.deepEqual(out.split('\n'), [line(third), line(second)])
  assert.ok(!isShallow(dir), 'the repository should no longer be shallow')
  assert.ok(!out.includes(first.sha))
})

test('fetch=true is a no-op on a checkout that is already complete', t => {
  const origin = createRepo(t)
  commit(origin, 'feat: first')
  tag(origin, 'v0.0.1')
  const second = commit(origin, 'feat: second')
  tag(origin, 'v0.0.2')

  const dir = createShallowClone(t, origin)
  git(dir, ['fetch', '--prune', '--tags', '--unshallow', 'origin'])
  assert.ok(!isShallow(dir))

  // `git fetch --unshallow` is a fatal error on a complete repository, so the
  // script must not ask for it unconditionally.
  const out = runChangelog(dir, {
    head: 'v0.0.2',
    base: 'v0.0.1',
    fetch: 'true'
  })

  assert.equal(out, line(second))
})
