const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

const src = __dirname;

try {
  headRef = core.getInput("head-ref");
  baseRef = core.getInput("base-ref");
  const myToken = core.getInput("myToken");
  const octokit = new github.GitHub(myToken);
  const org = github.context.repo.owner;
  const repo = github.context.repo.repo;

  const regexp = /^[\.A-Za-z0-9_-]*$/;

  if (!headRef) {
    headRef = github.context.sha;
  }

  if (!baseRef) {
    release = octokit.repos.getLatestRelease({
      owner: org,
      repo: repo
    });
    baseRef = JSON.parse(release).tag_name;
  }

  console.log(`head-ref: ${headRef}`);
  console.log(`base-ref: ${baseRef}`);

  if (!!headRef && !!baseRef && regexp.test(headRef) && regexp.test(baseRef)) {
    getChangelog(headRef, baseRef, org + "/" + repo);
  } else {
    const regexError =
      "Branch names must contain only numbers, strings, underscores, periods, and dashes.";
    core.setFailed(regexError);
  }
} catch (error) {
  core.setFailed(error.message);
}

async function getChangelog(headRef, baseRef, repoName) {
  try {
    let output = "";
    let err = "";

    // These are option configurations for the @actions/exec lib`
    const options = {};
    options.listeners = {
      stdout: data => {
        output += data.toString();
      },
      stderr: data => {
        err += data.toString();
      }
    };
    options.cwd = "./";

    await exec.exec(
      `${src}/changelog.sh`,
      [headRef, baseRef, repoName],
      options
    );

    if (output) {
      console.log(
        "\x1b[32m%s\x1b[0m",
        `Changelog between ${baseRef} and ${headRef}:\n${output}`
      );
      core.setOutput("changelog", output);
    } else {
      core.setFailed(err);
      process.exit(1);
    }
  } catch (err) {
    core.setFailed(
      `Could not generate changelog between references because: ${err.message}`
    );
    process.exit(0);
  }
}
