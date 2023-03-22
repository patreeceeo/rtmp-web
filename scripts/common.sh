#!/bin/bash

shopt -s globstar
client_sub_module_rel_paths=$(ls -1rd \
  src/**/*.ts \
  | grep -v test.ts$ \
  | grep -v server/
)
export client_sub_module_rel_paths

function get_out_path_for_client_module () {
  in_path=$1
  # remove src/ path segment
  preserved_path="$(echo "$in_path" | cut -d/ -f 2-)"
  # replace .ts with .js
  preserved_path_js="${preserved_path%.ts}.js"
  echo "public/$preserved_path_js"
}
export get_out_path_for_client_module

function build_client_module () {
  in_path="$1"
  out_path="$2"
  npx esbuild "$in_path" --outfile="$out_path" --platform=neutral --format=esm --target=esnext
}

function dev_client_module () {
  in_path="$1"
  out_path="$2"
  screen_session_name="$3"
  echo "starting $screen_session_name: $in_path > $out_path"
  screen -S "$screen_session_name" -d -m npx esbuild "$in_path" --outfile="$out_path" --platform=neutral --format=esm --target=esnext --watch
}

function get_screen_pid() {
  session_name="$1"
  screen -ls | grep "$session_name" | cut -d. -f1
}

function get_child_pid() {
  pid="$1"
  ps --ppid "$pid" -o pid --no-header
}
