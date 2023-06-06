#!/bin/bash

source ./scripts/common.sh

function build_client_modules() {
  ./scripts/build_client.ts "public" "$(join_array , $client_sub_module_rel_paths)" import_map_client.json
}

mkdir -p ./public \
  && cp ./src/index.html ./public \
  && cp -a "./src/examples/$active_project/assets/*" ./public/assets \
  && build_client_modules
