import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  captureError,
  CHANGELOG_SH,
  commit,
  createRepo,
  createShallowClone,
  isShallow,
  git,
  line,
  literalMarkdownSubject,
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

  assert.equal(out, line(head, 'octocat/hello-world'))
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

test('renders commit subjects as literal Markdown without shell interpretation', t => {
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

test('renders active Markdown as literal text with an inert code span', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(
    dir,
    'docs: [link](https://evil.invalid) ![pixel](https://evil.invalid/p.png) @team #467 GH-467 0123456789abcdef0123456789abcdef01234567 :smile: <b>bold</b> `code` *em* ~~strike~~ user@example.invalid'
  )

  const out = runChangelog(dir, { head: 'HEAD', base: 'base' })
  const prefix = `- [${head.short}](http://github.com/metcalfc/changelog-generator/commit/${head.sha}) - `
  const subject = out.slice(prefix.length)

  assert.ok(
    out.startsWith(prefix),
    'the generated commit link must be unchanged'
  )
  assert.equal(out, line(head))
  assert.equal(subject, literalMarkdownSubject(head.subject))
  assert.ok(subject.startsWith('`` '))
  assert.ok(subject.endsWith(' ``'))
})

test('normalizes control bytes without creating additional entries', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(
    dir,
    'fix:\ttab\u0007bell\u001b[31mansi\u007fdelete\rcontinued\u0085next\u2028line\u202eright\u2066isolate'
  )

  const out = runChangelog(dir, { head: 'HEAD', base: 'base' })
  const unsafeControl = [...out].find(character => {
    return (
      character !== '\n' &&
      (/[\p{Cc}\u2028\u2029]/u.test(character) ||
        /\p{Bidi_Control}/u.test(character))
    )
  })

  assert.equal(out, line(head))
  assert.equal(unsafeControl, undefined)
  assert.equal(out.split('\n').length, 1)
})

test('preserves Git subject folding for a multiline first paragraph', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(dir, 'feat: first line\ncontinued line')

  assert.equal(runChangelog(dir, { head: 'HEAD', base: 'base' }), line(head))
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

// Rendering subjects as literal Markdown made the script depend on a node
// interpreter. index.js passes the one already running the bundle, because a
// container job gets the runner's node mounted at /__e/node<version>/bin/node
// and never on the container's PATH -- `node` is absent in plenty of the base
// images people build jobs on, and the failure there is a bare exit 127.
test('the renderer runs under the interpreter ACTION_NODE names', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(dir, 'feat: rendered by the action interpreter')

  assert.equal(
    runChangelog(dir, {
      head: 'HEAD',
      base: 'base',
      env: { ACTION_NODE: process.execPath }
    }),
    line(head)
  )

  // If the script ignored ACTION_NODE and reached for PATH instead, an
  // unusable interpreter would go unnoticed and this would still pass.
  const error = captureError(() =>
    runChangelog(dir, {
      head: 'HEAD',
      base: 'base',
      env: { ACTION_NODE: join(dir, 'not-an-interpreter') }
    })
  )
  assert.notEqual(error.status, 0)
})

test('the renderer needs no node on PATH when ACTION_NODE is set', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(dir, 'feat: no interpreter on PATH')

  // Keep git reachable, drop everything else. Hosted images often carry a
  // system node in /usr/bin, so this cannot prove absence on its own -- the
  // bogus-interpreter case above is what proves ACTION_NODE is consulted.
  const gitDir = dirname(
    execFileSync('/bin/bash', ['-c', 'command -v git'], {
      encoding: 'utf8'
    }).trim()
  )

  assert.equal(
    runChangelog(dir, {
      head: 'HEAD',
      base: 'base',
      env: { PATH: gitDir, ACTION_NODE: process.execPath }
    }),
    line(head)
  )
})

// The assertions above compare the script against literalMarkdownSubject in
// the test helper, which is a second copy of the same logic -- a bug written
// into both would pass. These pin the escaping contract to literal expected
// strings instead, so the helper is never the oracle.
test('escapes commit subjects to known literal Markdown', t => {
  const cases = [
    ['fix: plain', '` fix: plain `'],
    ['fix: has `one` tick', '`` fix: has `one` tick ``'],
    ['fix: ```three``` ticks', '```` fix: ```three``` ticks ````'],
    ['fix: trailing tick`', '`` fix: trailing tick` ``'],
    ['`', '`` ` ``'],
    [
      'fix: [link](https://evil.invalid) @team #467',
      '` fix: [link](https://evil.invalid) @team #467 `'
    ],
    ['fix:\ttab\u001b[31mansi\u202ebidi', '` fix: tab [31mansi bidi `']
  ]

  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const commits = cases.map(([subject]) => commit(dir, subject))

  const lines = runChangelog(dir, { head: 'HEAD', base: 'base' }).split('\n')

  // Newest first, so the fixtures come back in reverse.
  assert.equal(lines.length, cases.length)
  cases.forEach(([, expected], index) => {
    const { sha, short } = commits[index]
    assert.equal(
      lines[cases.length - 1 - index],
      `- [${short}](http://github.com/metcalfc/changelog-generator/commit/${sha}) - ${expected}`
    )
  })
})
