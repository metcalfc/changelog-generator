import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  captureError,
  commit,
  createRepo,
  line,
  ROOT,
  tag
} from './helpers/repo.mjs'

// These run the built bundle the way the runner does: `node dist/index.js`
// with INPUT_* environment variables. That covers the wiring the other suites
// cannot see — argument marshalling, ncc asset relocation, the value written
// to GITHUB_OUTPUT, and the process exit code the runner uses to decide
// whether the step passed.

const BUNDLE = join(ROOT, 'dist', 'index.js')

function runAction(dir, inputs = {}) {
  // The runner creates this file before the step starts, and @actions/core
  // refuses to append to a path that does not exist.
  const outputFile = join(dir, 'github-output.txt')
  writeFileSync(outputFile, '')

  const env = {
    ...process.env,
    INPUT_MYTOKEN: 'not-a-real-token',
    'INPUT_HEAD-REF': 'HEAD',
    'INPUT_BASE-REF': 'base',
    INPUT_REVERSE: 'false',
    // Both refs are supplied and fetch is off, so nothing reaches the network.
    INPUT_FETCH: 'false',
    GITHUB_REPOSITORY: 'octocat/hello-world',
    GITHUB_OUTPUT: outputFile,
    ...inputs
  }

  const stdout = execFileSync('node', [BUNDLE], {
    cwd: dir,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  return { stdout, output: readFileSync(outputFile, 'utf8') }
}

test('the built action writes the changelog to GITHUB_OUTPUT', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')
  const head = commit(
    dir,
    'feat: [shipped](https://example.invalid) @maintainers'
  )

  const { output } = runAction(dir)

  assert.match(output, /^changelog<</m)
  assert.ok(
    output.includes(line(head, 'octocat/hello-world')),
    'the built action must write the literal-text subject'
  )
})

test('the built action fails the step when the changelog cannot be generated', t => {
  const dir = createRepo(t)
  commit(dir, 'feat: only commit')
  tag(dir, 'base')

  // Regression test. setFailed() was followed by process.exit(0), which threw
  // away the failing exit code: the runner saw a green step, and any step
  // consuming the changelog output got an empty string instead.
  const err = captureError(() =>
    runAction(dir, { 'INPUT_HEAD-REF': 'no-such-ref' })
  )

  assert.notEqual(err.status, 0, 'a failed changelog must fail the step')
  assert.match(String(err.stdout), /::error::/)
})

test('the built action rejects refs carrying shell metacharacters', t => {
  const dir = createRepo(t)
  commit(dir, 'chore: base')
  tag(dir, 'base')

  const err = captureError(() =>
    runAction(dir, { 'INPUT_HEAD-REF': 'HEAD; touch pwned' })
  )

  assert.notEqual(err.status, 0)
  assert.match(String(err.stdout), /Git ref names must contain only/)
  assert.ok(
    !existsSync(join(dir, 'pwned')),
    'the injected command must never reach the shell'
  )
})
