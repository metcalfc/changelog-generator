#!/bin/bash
set -eou pipefail

head_ref=$1
base_ref=$2
repo_url=$3
extra_flags=""

if [ "$4" == "true" ]; then
  extra_flags='--reverse'
fi

fetch=$5

# By default a GitHub action checkout is shallow and single-branch. Get all the
# tags, branches, and history. Redirect output to standard error which we can
# collect in the action.
#
# This has to be a single fetch. Chaining --depth=1 fetches ahead of
# --unshallow races on .git/shallow: each one rewrites the file that the next
# one has already read, and git intermittently aborts with "shallow file has
# changed since we read it". --unshallow is also an error on a repository that
# is already complete, so only ask for it when there is a shallow file.
if [ "$fetch" == "true" ]; then
  unshallow=""
  if [ -f "$(git rev-parse --git-path shallow)" ]; then
    unshallow="--unshallow"
  fi
  # Do not quote $unshallow, for the same reason as $extra_flags below.
  git fetch --prune --tags ${unshallow} origin '+refs/heads/*:refs/remotes/origin/*' 1>&2
fi

# if folks don't have a base ref to compare against just use the initial
# commit. This will show all the changes since the beginning but I can't
# think of a better default.
if [ -z "$base_ref" ]
then
  base_ref=$(git rev-list --max-parents=0 HEAD)
fi

# Bash quoting will get you. Do not quote the extra_flags. If its null
# we want it to disappear. If you quote it, it will go to git as an ""
# and thats not a valid arg.
log=$(git log "${base_ref}"..."${head_ref}" \
  --pretty=format:"%H%x00%h%x00%s" -z \
  ${extra_flags} |
  REPO_URL="$repo_url" "${ACTION_NODE:-node}" -e '
    const { readFileSync } = require("node:fs")

    const repoUrl = process.env.REPO_URL

    const fields = readFileSync(0, "utf8").split("\0")
    if (fields.at(-1) === "") {
      fields.pop()
    }
    if (fields.length % 3 !== 0) {
      console.error("Unexpected git log record")
      process.exit(1)
    }

    function literalMarkdown(value) {
      const normalized = value.replace(
        /[\p{Cc}\u2028\u2029]|\p{Bidi_Control}/gu,
        " "
      )
      const runs = normalized.match(/`+/g) || []
      const width = runs.reduce(
        (longest, run) => Math.max(longest, run.length),
        0
      )
      const delimiter = "`".repeat(width + 1)
      return `${delimiter} ${normalized} ${delimiter}`
    }

    const lines = []
    for (let index = 0; index < fields.length; index += 3) {
      const [full, short, subject] = fields.slice(index, index + 3)
      lines.push(
        `- [${short}](http://github.com/${repoUrl}/commit/${full}) - ${literalMarkdown(subject)}`
      )
    }
    process.stdout.write(lines.join("\n"))
  ')

if [ -z "$log" ];
then
  log="No Changes."
fi

printf '%s\n' "$log"
