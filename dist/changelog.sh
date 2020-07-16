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

git log "${base_ref}...${head_ref}" \
  --pretty=format:"* [\`%h\`](http://github.com/${repo_url}/commit/%H) - %s" \
  --reverse
