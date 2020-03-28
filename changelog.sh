#!/bin/bash
set -eou pipefail

head_ref=$1
base_ref=$2
repo_url=$3

git log "${base_ref}...${head_ref}" --pretty=format:"  * [view commit](http://github.com/${repo_url}/commit/%H) -  %s" --reverse
