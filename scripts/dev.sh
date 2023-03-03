#!/bin/bash

function assert_ok() {
  cmd="$@"
  $cmd
  if (( $? != 0 )); then
    echo "assert_ok: Previous command exited with non-zero status."
    echo "offending command: \`$cmd\`"
    echo "Exiting..."
    exit
  fi
}

if [ -x .git/hooks/pre-commit ]; then
  echo "pre-commit hook has been installed :)"
else
  echo "pre-commit hook has not been installed!"
  echo "run: cp scripts/git_hooks/pre-commit .git/hooks"
  echo "then try again."
  exit
fi


server_mod="./src/modules/server/mod.ts"

assert_ok stat "$server_mod" 1>/dev/null 2>/dev/null

mkdir public
assert_ok cp ./src/index.html ./public
assert_ok deno bundle --watch ./src/client/mod.ts ./public/client.bundle.js &
assert_ok deno bundle --watch ./src/common/dev_tools/client.ts ./public/dev_tools.bundle.js &
deno run --allow-net --allow-read --watch ./src/server/mod.ts

