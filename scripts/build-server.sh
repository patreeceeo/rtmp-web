#!/bin/bash
mkdir -p ./dist/modules \
  && cp -a ./src/modules/server ./dist/modules \
  && cp -a ./src/modules/common ./dist/modules \
  && cp ./import_map_prod.json ./dist
