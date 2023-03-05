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

rm esbuild_out.txt 2>/dev/null
rm -rf public
mkdir -p public/client
mkdir -p public/common
mkdir -p public/dev_client
assert_ok cp ./src/index.html ./public
./scripts/build-client-module.sh ./src/modules/client/mod.ts ./public/client/mod.js
./scripts/build-client-module.sh ./src/modules/client/canvas.ts ./public/client/canvas.js
./scripts/build-client-module.sh ./src/modules/common/Message.ts ./public/common/Message.js
./scripts/build-client-module.sh ./src/modules/common/State.ts ./public/common/State.js
./scripts/build-client-module.sh ./src/modules/dev_client/mod.ts ./public/dev_client/mod.js
./scripts/build-client-module.sh ./src/modules/dev_common/mod.ts ./public/dev_common/mod.js
deno run --allow-net --allow-read --watch "$server_mod"

# TODO make all the screen sessions exit
