import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ROOT } from './helpers/repo.mjs'

// `npm version` runs these through its `version` lifecycle script. They rewrite
// tracked files in place, and when one fails it leaves a half-applied bump
// behind — package.json on the new version, the docs still on the old one.
// `sed -i` used to be GNU-only here, so the release could only be cut on Linux
// and died partway through on macOS.

const scripts = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8')
).scripts
const releaseWorkflow = readFileSync(
  join(ROOT, '.github', 'workflows', 'release.yml'),
  'utf8'
)

/**
 * Run one of package.json's scripts against a copy of the files it edits, so
 * the real tree is never touched.
 */
function runBumpScript(t, name, version, files) {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-generator-bump-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true })
  for (const file of files) {
    cpSync(join(ROOT, file), join(dir, file))
  }

  execFileSync('sh', ['-c', scripts[name]], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, npm_package_version: version },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  return Object.fromEntries(
    files.map(file => [file, readFileSync(join(dir, file), 'utf8')])
  )
}

test('bump:readme rewrites the version in the docs', t => {
  const out = runBumpScript(t, 'bump:readme', '9.9.9', [
    'README.md',
    'SECURITY.md'
  ])

  assert.match(out['README.md'], /metcalfc\/changelog-generator@v9\.9\.9/)
  assert.ok(
    !/v4\.\d+\.\d+/.test(out['README.md']),
    'no old version may survive in README.md'
  )
  assert.match(out['SECURITY.md'], /v9\.9\.9/)
  assert.ok(!/v4\.\d+\.\d+/.test(out['SECURITY.md']))
})

test('bump:workflow rewrites the version in the workflows', t => {
  const out = runBumpScript(t, 'bump:workflow', '9.9.9', [
    '.github/workflows/release.yml'
  ])

  assert.match(out['.github/workflows/release.yml'], /v9\.9\.9/)
  assert.ok(
    !/v4\.\d+\.\d+/.test(out['.github/workflows/release.yml']),
    'no old version may survive in release.yml'
  )
})

test('the bump scripts avoid GNU-only sed -i', () => {
  // BSD sed reads the argument after -i as a backup suffix, so `sed -i "s/…/…/"`
  // silently means something different on macOS and aborts the release.
  for (const name of ['bump:readme', 'bump:workflow']) {
    assert.doesNotMatch(
      scripts[name],
      /sed\s+-i\s+["']?s/,
      `${name} must not use GNU-only in-place sed`
    )
  }
})

test('the release tag crosses into the shell only through the environment', () => {
  const stepStart = releaseWorkflow.indexOf(
    '      - name: Update Major Version Tag'
  )
  assert.notEqual(stepStart, -1, 'major-tag update step must exist')

  // Bound the slice at the next step. Reading to end-of-file only works while
  // this is the last step in the file, and silently widens if one is appended.
  const nextStep = releaseWorkflow.indexOf('\n      - name:', stepStart + 1)
  const step = releaseWorkflow.slice(
    stepStart,
    nextStep === -1 ? undefined : nextStep
  )
  const envStart = step.indexOf('\n        env:')
  assert.notEqual(envStart, -1, 'major-tag update step must declare env')

  const run = step.slice(0, envStart)
  const env = step.slice(envStart)

  assert.doesNotMatch(run, /\$\{\{\s*github\.ref_name\s*\}\}/)
  assert.match(run, /printf '[^']+' "\$TAG_NAME"/)
  assert.match(run, /git tag -f "\$MAJOR_VERSION"/)
  assert.match(run, /git push origin "\$MAJOR_VERSION" --force/)
  assert.match(env, /TAG_NAME: \$\{\{\s*github\.ref_name\s*\}\}/)
})
