#!/bin/bash

client_sub_module_rel_paths=$(ls -1rd src/modules/client/*.ts src/modules/common/*.ts)
export client_sub_module_rel_paths

function get_out_path_for_client_module () {
  in_path=$1
  preserved_path="$(echo "$in_path" | cut -d/ -f 3-)"
  echo "public/$(dirname "$preserved_path")"
}
export get_out_path_for_client_module
