#!/bin/bash

source ./scripts/common.sh

function build_client_modules() {
  for in_path in $client_sub_module_rel_paths; do
    out_path=$(get_out_path_for_client_module "$in_path")
    npx tsc "$in_path" --outDir "./dist/$out_path" --lib esnext,dom --target esnext --module es2020
  done
}

mkdir -p ./dist/public \
  && cp ./src/index.html ./dist/public \
  && build_client_modules
