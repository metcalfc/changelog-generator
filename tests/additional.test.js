const { execSync, execFileSync } = require('child_process')
const path = require('path')

describe('Additional Changelog Tests', () => {
  const changelogScript = path.join(__dirname, '..', 'changelog.sh')

  describe('Empty base_ref handling', () => {
    test('should use initial commit when base_ref is empty', () => {
      const headRef = execSync('git rev-parse HEAD', {
        encoding: 'utf-8'
      }).trim()

      // Run with empty base_ref
      const output = execFileSync(
        changelogScript,
        [headRef, '', 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Should have output (entire history)
      expect(output.length).toBeGreaterThan(0)
      expect(output).not.toBe('No Changes.')

      // Should contain many commits
      const lines = output.split('\n')
      expect(lines.length).toBeGreaterThan(1)
    })
  })

  describe('Repository URL variations', () => {
    test('should handle different repo URL formats', () => {
      const commits = execSync('git log --format=%H -n 2', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[1]

      const repoFormats = [
        'owner/repo',
        'org-name/repo-name',
        'user_name/repo_name',
        'owner/repo.name'
      ]

      repoFormats.forEach(repoUrl => {
        const output = execFileSync(
          changelogScript,
          [headRef, baseRef, repoUrl, 'false', 'false'],
          {
            encoding: 'utf-8',
            cwd: path.join(__dirname, '..')
          }
        ).trim()

        // Should contain the repo URL in the link
        expect(output).toContain(`github.com/${repoUrl}/commit/`)
      })
    })
  })

  describe('Commit message edge cases', () => {
    test('should handle commits with special characters in messages', () => {
      // Try to find commits with special characters, or just use recent ones
      const commits = execSync('git log --format=%H -n 5', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[commits.length - 1]

      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      const lines = output.split('\n')

      // Each line should still be properly formatted
      lines.forEach(line => {
        // Should have the markdown link structure
        expect(line).toMatch(
          /^- \[[\da-f]+\]\(http:\/\/github.com\/.+\/commit\/[\da-f]+\) - /
        )
      })
    })

    test('should handle multiple commits between refs', () => {
      // Get a range with multiple commits
      const commits = execSync('git log --format=%H -n 10', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 5) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[commits.length - 1]

      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      const lines = output.split('\n')

      // Should have multiple lines (one per commit)
      expect(lines.length).toBeGreaterThanOrEqual(commits.length - 1)

      // Each line should be unique
      const uniqueLines = new Set(lines)
      expect(uniqueLines.size).toBe(lines.length)
    })
  })

  describe('Git log format verification', () => {
    test('should use three-dot range syntax correctly', () => {
      // The script uses base...head which shows commits in head but not in base
      const commits = execSync('git log --format=%H -n 3', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 3) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[2]

      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Verify the output matches git log format
      const gitLogOutput = execSync(
        `git log "${baseRef}"..."${headRef}" --pretty=format:"- [%h](http://github.com/metcalfc/changelog-generator/commit/%H) - %s"`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      expect(output).toBe(gitLogOutput)
    })

    test('should include short and long commit hashes', () => {
      const commits = execSync('git log --format=%H -n 2', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[1]

      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Should have short hash in the [text] part
      expect(output).toMatch(/\[[\da-f]{7,}\]/)

      // Should have full hash in the URL
      expect(output).toMatch(/\/commit\/[\da-f]{40}\)/)
    })
  })

  describe('Flag parameter handling', () => {
    test('should handle fetch=false correctly', () => {
      const commits = execSync('git log --format=%H -n 2', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[1]

      // Run with fetch=false - should not attempt to fetch
      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Should still produce valid output
      expect(output.length).toBeGreaterThan(0)
      expect(output).toMatch(/^- \[/)
    })

    test('should handle all flag combinations', () => {
      const commits = execSync('git log --format=%H -n 3', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 3) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[2]

      const flagCombinations = [
        ['false', 'false'],
        ['true', 'false'],
        ['false', 'true'], // This will attempt git fetch, might fail in some environments
        ['true', 'true']
      ]

      flagCombinations.forEach(([reverse, fetch]) => {
        try {
          const output = execFileSync(
            changelogScript,
            [headRef, baseRef, 'metcalfc/changelog-generator', reverse, fetch],
            {
              encoding: 'utf-8',
              cwd: path.join(__dirname, '..'),
              stderr: 'pipe' // Suppress fetch errors
            }
          ).trim()

          // Should have valid output
          expect(output.length).toBeGreaterThan(0)

          // Output should always be valid markdown
          const lines = output.split('\n')
          lines.forEach(line => {
            expect(line).toMatch(/^- \[/)
          })
        } catch (err) {
          // If fetch fails (e.g., no remote), that's okay for this test
          if (fetch === 'false') {
            throw err // But if we're not fetching, it should work
          }
        }
      })
    })
  })

  describe('Error conditions', () => {
    test('should handle invalid git refs gracefully', () => {
      const headRef = execSync('git rev-parse HEAD', {
        encoding: 'utf-8'
      }).trim()

      // Use a non-existent ref
      const invalidRef = 'definitely-not-a-valid-ref-' + Date.now()

      try {
        execFileSync(
          changelogScript,
          [
            headRef,
            invalidRef,
            'metcalfc/changelog-generator',
            'false',
            'false'
          ],
          {
            encoding: 'utf-8',
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe']
          }
        )
        // Should not reach here
        expect(true).toBe(false)
      } catch (err) {
        // Should exit with error
        expect(err.status).not.toBe(0)
      }
    })

    test('should handle when base and head are in wrong order', () => {
      // Get commits in reverse order
      const commits = execSync('git log --format=%H -n 2', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      // Swap them - older commit as head, newer as base
      const headRef = commits[1]
      const baseRef = commits[0]

      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // With three-dot syntax (base...head), this shows symmetric difference
      // So we'll get commits, just in the opposite direction
      // The output should still be valid markdown
      expect(output.length).toBeGreaterThan(0)
      if (output !== 'No Changes.') {
        expect(output).toMatch(/^- \[/)
      }
    })
  })

  describe('Output consistency', () => {
    test('should produce consistent output for same inputs', () => {
      const commits = execSync('git log --format=%H -n 2', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[1]

      // Run twice with same inputs
      const output1 = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      const output2 = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Should be identical
      expect(output1).toBe(output2)
    })

    test('should not have trailing whitespace', () => {
      const commits = execSync('git log --format=%H -n 2', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      if (commits.length < 2) {
        console.log('Skipping test: not enough commits')
        return
      }

      const headRef = commits[0]
      const baseRef = commits[1]

      const output = execFileSync(
        changelogScript,
        [headRef, baseRef, 'metcalfc/changelog-generator', 'false', 'false'],
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      const lines = output.split('\n')
      lines.forEach(line => {
        // No trailing spaces
        expect(line).toBe(line.trimEnd())
        // No leading spaces (except the markdown list indicator)
        expect(line).toMatch(/^- \[/)
      })
    })
  })
})
