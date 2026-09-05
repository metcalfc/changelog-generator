import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const CHANGELOG_SH = join(ROOT, 'changelog.sh')

// Commit timestamps have to be strictly increasing for `git log` ordering to be
// deterministic, so hand out a fresh minute for every commit the suite makes.
let tick = 0
function nextDate() {
  const date = new Date(Date.UTC(2020, 0, 1, 0, 0, 0) + tick * 60_000)
  tick += 1
  return date.toISOString()
}

export function git(cwd, args, env = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  }).trim()
}

/**
 * A throwaway git repo, cleaned up when the test finishes.
 */
export function createRepo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-generator-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  git(dir, ['init', '--quiet', '--initial-branch=main'])
  git(dir, ['config', 'user.email', 'test@example.com'])
  git(dir, ['config', 'user.name', 'Changelog Test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
  git(dir, ['config', 'tag.gpgsign', 'false'])
  return dir
}

/**
 * Commit `subject` and return the commit's short and full SHAs.
 */
export function commit(dir, subject, body = '') {
  const date = nextDate()
  writeFileSync(join(dir, 'file.txt'), `${subject}\n`)
  git(dir, ['add', '--all'])
  git(dir, ['commit', '--quiet', '--message', subject, '--message', body], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date
  })

  const sha = git(dir, ['rev-parse', 'HEAD'])
  return { sha, short: git(dir, ['rev-parse', '--short', sha]), subject }
}

export function tag(dir, name) {
  git(dir, ['tag', name])
  return name
}

/**
 * Invoke changelog.sh the same way index.js does. `fetch` defaults to false
 * because the fixtures have no reachable remote.
 */
export function runChangelog(
  dir,
  {
    head,
    base = '',
    repo = 'metcalfc/changelog-generator',
    reverse = 'false',
    fetch = 'false',
    env = {}
  }
) {
  return execFileSync(CHANGELOG_SH, [head, base, repo, reverse, fetch], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env }
  }).trimEnd()
}

/**
 * A shallow, single-branch clone of `origin` — what actions/checkout leaves
 * behind by default, and the state the `fetch` input exists to repair.
 */
export function createShallowClone(t, origin) {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-generator-clone-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  git(dir, ['clone', '--depth=1', '--no-tags', `file://${origin}`, dir])
  git(dir, ['config', 'user.email', 'test@example.com'])
  git(dir, ['config', 'user.name', 'Changelog Test'])
  return dir
}

export function isShallow(dir) {
  return existsSync(join(dir, '.git', 'shallow'))
}

/**
 * Run `fn` and return the error it threw, failing the test if it succeeds.
 */
export function captureError(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the command to fail, but it succeeded')
}

export function literalMarkdownSubject(subject) {
  const normalized = subject.replace(
    /[\p{Cc}\u2028\u2029]|\p{Bidi_Control}/gu,
    ' '
  )
  const runs = normalized.match(/`+/g) || []
  const width = runs.reduce((longest, run) => Math.max(longest, run.length), 0)
  const delimiter = '`'.repeat(width + 1)
  return `${delimiter} ${normalized} ${delimiter}`
}

/**
 * The markdown line changelog.sh is expected to emit for a commit.
 */
export function line(commitInfo, repo = 'metcalfc/changelog-generator') {
  const subject = literalMarkdownSubject(commitInfo.subject)
  return `- [${commitInfo.short}](http://github.com/${repo}/commit/${commitInfo.sha}) - ${subject}`
}
