import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT } from './helpers/repo.mjs'

const workflow = readFileSync(
  join(ROOT, '.github', 'workflows', 'release.yml'),
  'utf8'
)

test('release attestation is gated on exact-revision dist verification', () => {
  const verifyStart = workflow.indexOf('  verify-dist:')
  const releaseStart = workflow.indexOf('  release:')
  assert.ok(verifyStart >= 0 && releaseStart > verifyStart)

  const verifyJob = workflow.slice(verifyStart, releaseStart)
  // Queued, not preempted: a cancel can land between publishing the release
  // and moving the major tag.
  assert.match(workflow, /group: release-\$\{\{ github\.ref \}\}/)
  assert.match(workflow, /cancel-in-progress: false/)
  assert.doesNotMatch(workflow, /cancel-in-progress: true/)
  assert.match(verifyJob, /permissions:\n\s+contents: read/)
  assert.match(verifyJob, /ref: \$\{\{\s*github\.sha\s*\}\}/)
  assert.match(verifyJob, /node-version: '24'/)
  assert.match(verifyJob, /run: npm ci/)
  // The bundle checks themselves live in test/dist.test.mjs so there is one
  // copy of them; the gate's job is to make the release depend on that suite.
  assert.match(verifyJob, /run: npm test/)

  const releaseJob = workflow.slice(releaseStart)
  assert.match(releaseJob, /release:\n\s+needs: verify-dist/)
  assert.match(releaseJob, /ref: \$\{\{\s*github\.sha\s*\}\}/)

  const unchangedCheck = releaseJob.indexOf(
    'git diff --exit-code "$GITHUB_SHA" -- dist/index.js dist/changelog.sh'
  )
  const attestation = releaseJob.indexOf(
    'uses: actions/attest-build-provenance@'
  )
  assert.ok(unchangedCheck >= 0 && attestation > unchangedCheck)

  const tagChecks = releaseJob.match(/test "\$remote_sha" = "\$GITHUB_SHA"/g)
  assert.equal(tagChecks?.length, 2)
  assert.match(releaseJob, /tag: \$\{\{\s*github\.ref_name\s*\}\}/)
  assert.match(releaseJob, /commit: \$\{\{\s*github\.sha\s*\}\}/)
  assert.match(releaseJob, /immutableCreate: true/)
})

test('the changelog is based on the previous release of the same line', () => {
  const releaseJob = workflow.slice(workflow.indexOf('  release:'))

  // The API's latest release is the highest across every line, so a v4 patch
  // diffed against v5 and listed commits from both. git describe answers with
  // the previous release reachable from this commit, which is right on either.
  assert.match(releaseJob, /fetch-depth: 0/)
  assert.match(releaseJob, /git describe --tags --abbrev=0/)
  assert.match(
    releaseJob,
    /base-ref: \$\{\{ steps\.previous\.outputs\.tag \}\}/
  )

  // Without --match, the moving major tags (v4, v5) sit on the same commits as
  // the release tags and describe may answer with one of those instead.
  assert.match(releaseJob, /--match 'v\[0-9\]\*\.\[0-9\]\*\.\[0-9\]\*'/)

  // The lookup must precede the step that consumes it.
  assert.ok(
    releaseJob.indexOf('id: previous') <
      releaseJob.indexOf('base-ref: ${{ steps.previous.outputs.tag }}')
  )
})
