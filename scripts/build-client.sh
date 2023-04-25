#!/bin/bash

source ./scripts/common.sh

function build_client_modules() {
  ./scripts/build_client.ts "dist/public" "$(join_array , $client_sub_module_rel_paths)" import_map_client.json --inline-sourcemap
}

mkdir -p ./dist/public \
  && cp ./src/index.html ./dist/public \
  && cp "./src/examples/$active_project/assets" ./dist/public/assets -a \
  && build_client_modules
