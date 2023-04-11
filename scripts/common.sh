#!/bin/bash

export active_project=platformer

shopt -s globstar
client_sub_module_rel_paths=$(ls -1rd \
  src/**/*.ts \
  | grep -v test.ts$
)
export client_sub_module_rel_paths

function join_array () {
  local IFS="$1"
  shift
  echo "$*"
}
