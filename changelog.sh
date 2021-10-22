#!/bin/bash
set -eou pipefail

head_ref=$1
base_ref=$2
repo_url=$3

# By default a GitHub action checkout is shallow. Get all the tags, branches,
# and history. Redirect output to standard error which we can collect in the
# action.
git fetch --depth=1 origin +refs/tags/*:refs/tags/* 1>&2
git fetch --no-tags --prune --depth=1 origin +refs/heads/*:refs/remotes/origin/* 1>&2
git fetch --prune --unshallow 1>&2

# if folks don't have a base ref to compare against just use the initial
# commit. This will show all the changes since the beginning but I can't
# think of a better default.
if [ -z "$base_ref" ]
then
  base_ref=$(git rev-list --max-parents=0 HEAD)
fi

log=$(git log "${base_ref}...${head_ref}" \
  --pretty=format:"* [%h](http://github.com/${repo_url}/commit/%H) - %s" \
  --reverse)

if [ -z "$log" ];
then
  log="No Changes."
fi

echo "$log"
