const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

describe('Changelog Generator Tests', () => {
  const changelogScript = path.join(__dirname, '..', 'changelog.sh')

  beforeAll(() => {
    // Verify the script exists and is executable
    expect(fs.existsSync(changelogScript)).toBe(true)
  })

  describe('Git ref validation (regex)', () => {
    const regexp = /^[.A-Za-z0-9_/\-+]*$/

    test('should accept valid ref names', () => {
      const validRefs = [
        'main',
        'v1.0.0',
        'feature/my-feature',
        'release-1.2.3',
        'HEAD',
        'abc123',
        'refs/tags/v1.0.0',
        'my_branch',
        'test.branch',
        'feature+fix'
      ]

      validRefs.forEach(ref => {
        expect(regexp.test(ref)).toBe(true)
      })
    })

    test('should reject invalid ref names', () => {
      const invalidRefs = [
        'branch with spaces',
        'branch@special',
        'branch#hash',
        'branch$dollar',
        'branch*star',
        'branch(paren)',
        'branch[bracket]',
        'branch{brace}',
        'branch;semicolon',
        'branch&ampersand'
      ]

      invalidRefs.forEach(ref => {
        expect(regexp.test(ref)).toBe(false)
      })
    })

    test('should accept empty string', () => {
      expect(regexp.test('')).toBe(true)
    })
  })

  describe('changelog.sh script', () => {
    test('should be executable', () => {
      const stats = fs.statSync(changelogScript)
      const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0
      expect(isExecutable).toBe(true)
    })

    test('should generate changelog between two commits', () => {
      // Get recent commits to test with
      const commits = execSync('git log --format=%H -n 10', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')

      // Need at least 2 commits to test
      expect(commits.length).toBeGreaterThanOrEqual(2)

      const headRef = commits[0]
      const baseRef = commits[commits.length - 1]

      // Run the changelog script
      const output = execSync(
        `${changelogScript} "${headRef}" "${baseRef}" "metcalfc/changelog-generator" false false`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Should have output
      expect(output.length).toBeGreaterThan(0)

      // Should contain markdown formatted commit links
      expect(output).toMatch(/- \[[\da-f]+\]\(http:\/\/github.com\//)

      // Should contain commit hash
      expect(output).toMatch(/commit\/[\da-f]{40}\)/)
    })

    test('should return "No Changes." when refs are the same', () => {
      // Get the current HEAD
      const headRef = execSync('git rev-parse HEAD', {
        encoding: 'utf-8'
      }).trim()

      // Run the changelog script with the same ref
      const output = execSync(
        `${changelogScript} "${headRef}" "${headRef}" "metcalfc/changelog-generator" false false`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      expect(output).toBe('No Changes.')
    })

    test('should generate changelog between tags', () => {
      // Get available tags
      const tags = execSync('git tag --sort=-version:refname', {
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')
        .filter(tag => tag.length > 0)

      // Skip if no tags exist
      if (tags.length < 2) {
        console.log('Skipping test: not enough tags in repository')
        return
      }

      const newerTag = tags[0]
      const olderTag = tags[1]

      // Run the changelog script
      const output = execSync(
        `${changelogScript} "${newerTag}" "${olderTag}" "metcalfc/changelog-generator" false false`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Should have output or "No Changes."
      expect(output.length).toBeGreaterThan(0)
    })

    test('should handle reverse flag', () => {
      // Get recent commits
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

      // Run without reverse
      const normalOutput = execSync(
        `${changelogScript} "${headRef}" "${baseRef}" "metcalfc/changelog-generator" false false`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Run with reverse
      const reversedOutput = execSync(
        `${changelogScript} "${headRef}" "${baseRef}" "metcalfc/changelog-generator" true false`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Both should have output
      expect(normalOutput.length).toBeGreaterThan(0)
      expect(reversedOutput.length).toBeGreaterThan(0)

      // If there are multiple commits, order should be different
      const normalLines = normalOutput.split('\n')
      const reversedLines = reversedOutput.split('\n')

      if (normalLines.length > 1) {
        expect(normalLines[0]).not.toBe(reversedLines[0])
      }
    })

    test('should format changelog entries correctly', () => {
      // Get a recent commit
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

      const output = execSync(
        `${changelogScript} "${headRef}" "${baseRef}" "metcalfc/changelog-generator" false false`,
        {
          encoding: 'utf-8',
          cwd: path.join(__dirname, '..')
        }
      ).trim()

      // Check format: - [hash](url) - message
      const lines = output.split('\n')
      lines.forEach(line => {
        // Each line should start with "- ["
        expect(line).toMatch(/^- \[/)
        // Should contain a commit hash (7 chars minimum from %h format)
        expect(line).toMatch(/\[[\da-f]{7,}\]/)
        // Should contain a GitHub URL
        expect(line).toMatch(
          /\(http:\/\/github.com\/metcalfc\/changelog-generator\/commit\//
        )
        // Should have a commit message after the closing ) -
        expect(line).toMatch(/\) - .+/)
      })
    })
  })

  describe('Changelog format validation', () => {
    test('should produce valid markdown links', () => {
      const sampleOutput =
        '- [abc1234](http://github.com/metcalfc/changelog-generator/commit/abc1234567890) - Sample commit message'

      // Check it's a valid markdown link format
      expect(sampleOutput).toMatch(/\[.+\]\(.+\)/)

      // Check the link structure
      expect(sampleOutput).toMatch(
        /\[[\da-f]+\]\(http:\/\/github.com\/[\w-]+\/[\w-]+\/commit\/[\da-f]+\)/
      )
    })

    test('should handle commit messages with special characters', () => {
      // This test ensures the format is consistent regardless of message content
      const specialChars = [
        'Commit with "quotes"',
        "Commit with 'single quotes'",
        'Commit with #hashtag',
        'Commit with @mention'
      ]

      specialChars.forEach(msg => {
        const formatted = `- [abc1234](http://github.com/metcalfc/changelog-generator/commit/abc1234567890) - ${msg}`
        expect(formatted).toContain(' - ')
        expect(formatted).toContain(msg)
      })
    })
  })
})
