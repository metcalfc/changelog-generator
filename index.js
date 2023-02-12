import { getInput, setFailed, setOutput } from '@actions/core'
import { exec as _exec } from '@actions/exec'
import { getOctokit, context } from '@actions/github'

const src = __dirname

async function run() {
  try {
    var headRef = getInput('head-ref')
    var baseRef = getInput('base-ref')
    const myToken = getInput('myToken')
    const reverse = getInput('reverse')
    const fetch = getInput('fetch')
    const octokit = new getOctokit(myToken)
    const { owner, repo } = context.repo
    const regexp = /^[.A-Za-z0-9_/-]*$/

    if (!headRef) {
      headRef = context.sha
    }

    if (!baseRef) {
      const latestRelease = await octokit.rest.repos.getLatestRelease({
        owner: owner,
        repo: repo
      })
      if (latestRelease) {
        baseRef = latestRelease.data.tag_name
      } else {
        setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases.`
        )
      }
    }

    console.log(`head-ref: ${headRef}`)
    console.log(`base-ref: ${baseRef}`)

    if (
      !!headRef &&
      !!baseRef &&
      regexp.test(headRef) &&
      regexp.test(baseRef)
    ) {
      getChangelog(headRef, baseRef, owner + '/' + repo, reverse, fetch)
    } else {
      setFailed(
        'Branch names must contain only numbers, strings, underscores, periods, forward slashes, and dashes.'
      )
    }
  } catch (error) {
    setFailed(error.message)
  }
}

async function getChangelog(headRef, baseRef, repoName, reverse, fetch) {
  try {
    let output = ''
    let err = ''

    // These are option configurations for the @actions/exec lib`
    const options = {}
    options.listeners = {
      stdout: data => {
        output += data.toString()
      },
      stderr: data => {
        err += data.toString()
      }
    }
    options.cwd = './'

    await _exec(
      `${src}/changelog.sh`,
      [headRef, baseRef, repoName, reverse, fetch],
      options
    )

    if (output) {
      console.log(
        '\x1b[32m%s\x1b[0m',
        `Changelog between ${baseRef} and ${headRef}:\n${output}`
      )
      setOutput('changelog', output)
    } else {
      setFailed(err)
      process.exit(1)
    }
  } catch (err) {
    setFailed(
      `Could not generate changelog between references because: ${err.message}`
    )
    process.exit(0)
  }
}

try {
  run()
} catch (error) {
  setFailed(error.message)
}
