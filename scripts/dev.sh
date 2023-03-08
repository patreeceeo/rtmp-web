#!/bin/bash

function assert_ok() {
  cmd="$*"
  if ! $cmd; then
    echo "assert_ok: Previous command exited with non-zero status."
    echo "offending command: \`$cmd\`"
    echo "Exiting..."
    exit
  fi
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
./scripts/build-client-module.sh ./src/modules/common/socket.ts ./public/common/socket.js
./scripts/build-client-module.sh ./src/modules/dev_client/mod.ts ./public/dev_client/mod.js
./scripts/build-client-module.sh ./src/modules/dev_common/mod.ts ./public/dev_common/mod.js
deno run --allow-net --allow-read --watch "$server_mod"

# TODO make all the screen sessions exit
