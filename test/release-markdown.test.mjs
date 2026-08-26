import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT } from './helpers/repo.mjs'

test('the release workflow uses the checked-out, repaired action', () => {
  const workflow = readFileSync(
    join(ROOT, '.github', 'workflows', 'release.yml'),
    'utf8'
  )
  const stepStart = workflow.indexOf('      - name: Generate changelog')
  const nextStep = workflow.indexOf('\n      - name:', stepStart + 1)
  const step = workflow.slice(stepStart, nextStep)

  assert.match(step, /uses: \.\//)
  assert.doesNotMatch(step, /uses: metcalfc\/changelog-generator@/)
})
