import test from 'node:test'
import assert from 'node:assert/strict'

import { isValidRef } from '../refs.mjs'

// REF_PATTERN is a shell-safety whitelist, not a git ref validator: it also
// admits strings git itself rejects (`foo..bar`, `foo.lock`, a leading dot).
// That is fine for its purpose — changelog.sh passes refs to `git log`, which
// rejects malformed ones on its own — but the tests below only claim the
// shell-safety property.
test('isValidRef accepts the ref names real workflows pass in', () => {
  const valid = [
    'main',
    'v4.7.0',
    'HEAD',
    'origin/test/branch',
    'refs/tags/v1.0.0',
    'feature_branch',
    'dependabot/npm_and_yarn/eslint-10.8.0',
    'release-4.x',
    'weird+but+legal',
    '0ea1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3'
  ]

  for (const ref of valid) {
    assert.equal(isValidRef(ref), true, `expected ${ref} to be valid`)
  }
})

test('isValidRef rejects anything the shell could reinterpret', () => {
  const invalid = [
    'main; rm -rf /',
    '$(whoami)',
    '`id`',
    'main && curl evil.sh',
    'main | tee /tmp/x',
    'a ref with spaces',
    "main'",
    'main"',
    'main\nsecond-line',
    'main${IFS}x',
    '*',
    '~/main',
    'main#fragment',
    'main!bang',
    'main@{upstream}'
  ]

  for (const ref of invalid) {
    assert.equal(
      isValidRef(ref),
      false,
      `expected ${JSON.stringify(ref)} to be rejected`
    )
  }
})

test('isValidRef rejects empty and non-string input', () => {
  // The action treats "no ref supplied" as a failure rather than defaulting,
  // so the empty string must not pass even though the pattern allows it.
  assert.equal(isValidRef(''), false)
  assert.equal(isValidRef(undefined), false)
  assert.equal(isValidRef(null), false)
  assert.equal(isValidRef(42), false)
  assert.equal(isValidRef(['main']), false)
})
