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
  --pretty=format:"- [%h](http://github.com/${repo_url}/commit/%H) - %s" \
  ${extra_flags})

if [ -z "$log" ];
then
  log="No Changes."
fi

echo "$log"
