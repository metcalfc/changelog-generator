import { getInput, setFailed, setOutput } from '@actions/core'
import { exec as _exec } from '@actions/exec'
import { context, getOctokit } from '@actions/github'
import { isValidRef } from './refs.mjs'

async function run() {
  try {
    let headRef = getInput('head-ref')
    let baseRef = getInput('base-ref')
    const myToken = getInput('myToken')
    const reverse = getInput('reverse')
    const fetch = getInput('fetch')
    const octokit = new getOctokit(myToken)
    const { owner, repo } = context.repo

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

    if (isValidRef(headRef) && isValidRef(baseRef)) {
      getChangelog(headRef, baseRef, owner + '/' + repo, reverse, fetch)
    } else {
      setFailed(
        'Git ref names must contain only numbers, strings, underscores, periods, forward slashes, pluses, and dashes.'
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

    // changelog.sh shells out to node to render commit subjects as literal
    // Markdown. Hand it the interpreter already running this bundle rather
    // than making it search PATH: in a container job the runner mounts its own
    // node at /__e/node<version>/bin/node and never puts it on the container's
    // PATH, so `node` is frequently absent in images users build jobs on.
    options.env = { ...process.env, ACTION_NODE: process.execPath }

    // ncc's asset relocator rewrites this literal into a bundle-relative path
    // and copies changelog.sh into dist/, so `__dirname` resolves inside the
    // bundle even though the script lives next to it rather than next to this
    // file. test/action.test.mjs runs the built bundle to prove it.
    await _exec(
      `${__dirname}/changelog.sh`,
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
    }
  } catch (err) {
    // setFailed sets a failing exit code on its own. Calling process.exit()
    // here used to override it with 0, so a changelog that failed to generate
    // still reported success and downstream steps saw an empty output.
    setFailed(
      `Could not generate changelog between references because: ${err.message}`
    )
  }
}

try {
  run()
} catch (error) {
  setFailed(error.message)
}
