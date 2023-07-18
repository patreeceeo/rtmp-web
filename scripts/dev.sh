#!/bin/bash

source ./scripts/common.sh

function assert_ok() {
  cmd="$*"
  if ! $cmd; then
    echo "assert_ok: Previous command exited with non-zero status."
    echo "offending command: \`$cmd\`"
    echo "Exiting..."
    exit
  fi
}

function get_screen_session_name_for_path () {
  activity=$1
  preserved_path=$2
  sanitized_path=$(echo "$preserved_path" | tr "/" "-")
  echo "$activity:$sanitized_path"
}

function screen_session_quit_all_by_name() {
  for session in $(screen -ls | grep "$1" | awk '{print $1}'); do
    screen -S "$session" -X quit
  done
}

function cleanup() {
  # quit screen sessions
  screen_session_quit_all_by_name dev_server
  screen_session_quit_all_by_name esbuild
}

hook_install_location=".git/hooks/pre-commit"
hook_source_location="scripts/git_hooks/pre-commit"

# check that installed hook is executable and its contents are eqaul to the source
if [ -x "$hook_install_location" ] && diff "$hook_install_location" "$hook_source_location"; then
  echo "pre-commit hook has been installed :)"
else
  echo "pre-commit hook is either not executable, or its contents do not match what was expected."
  echo "run: cp scripts/git_hooks/pre-commit .git/hooks"
  echo "then try again."
  exit
fi


server_mod="./src/examples/$active_project/server/mod.ts"

assert_ok stat "$server_mod" 1>/dev/null 2>/dev/null

assert_ok mkdir -p public
assert_ok cp ./src/index.html ./public
assert_ok cp ./src/entity.html ./public

if [ -d "src/examples/$active_project/assets" ]; then
  assert_ok cp "src/examples/$active_project/assets" ./public/assets -a
fi

screen -S esbuild -d -m ./scripts/build_client.ts "public" "$(join_array , $client_sub_module_rel_paths)" import_map_client.json --watch --inline-sourcemap

screen -S dev_server -d -m deno run --allow-net --allow-read --watch "src/modules/dev_server/mod.ts"

trap cleanup SIGINT
deno run --allow-net --allow-read --watch "$server_mod"
cleanup
