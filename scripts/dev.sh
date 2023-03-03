#!/bin/bash

function assert_ok() {
  if (( $? != 0 )); then
    echo "Assertion failed: Previous command exited with non-zero status. Exiting..."
    exit
  fi
}

mkdir public
cp ./src/index.html ./public
assert_ok
deno bundle --watch ./src/client/mod.ts ./public/client.bundle.js &
assert_ok
deno bundle --watch ./src/common/dev_tools/client.ts ./public/dev_tools.bundle.js &
assert_ok
deno run --allow-net --allow-read --watch ./src/server/mod.ts
assert_ok

