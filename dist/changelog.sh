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

# If there is no release for comparison, the initial commit is used when "$commit"
# is obtained, This will show all the changes since the beginning.
# the latest tag is used when "$tag" is obtained, and the default is "$commit".
if [ "$base_ref" = "\$commit" ]
then
  base_ref=$(git rev-list --max-parents=0 HEAD)
  flag=$head_ref # Include the first commit
elif [ "$base_ref" = "\$tag" ]
then
  tagName=$(git describe --tags --abbrev=0 $(git rev-list --tags --max-count=1 --skip=1))
  base_ref=$(git rev-list ${tagName} --max-count=1)
  flag="${base_ref}...${head_ref}"
else
  flag="${base_ref}...${head_ref}"
fi

log=$(git log "${flag}" \
  --pretty=format:"* [\`%h\`](http://github.com/${repo_url}/commit/%H) - %s" \
  --reverse)

if [ -z "$log" ];
then
  log="No Changes."
fi

echo "$log"
