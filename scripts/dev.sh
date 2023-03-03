#!/bin/bash

# TODO just use &&
function assert_ok() {
  if (( $? != 0 )); then
    echo "Assertion failed: Previous command exited with non-zero status. Exiting..."
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


mkdir public
cp ./src/index.html ./public
assert_ok
deno bundle --watch ./src/modules/client/mod.ts ./public/client.bundle.js &
assert_ok
deno bundle --watch ./src/modules/dev_client/mod.ts ./public/dev_client.bundle.js &
assert_ok
deno run --allow-net --allow-read --watch ./src/modules/server/mod.ts
assert_ok

