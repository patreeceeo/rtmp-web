#!/bin/bash
mkdir -p ./dist/modules \
  && cp -a ./src/modules/server ./dist/modules \
  && cp ./import_map.json ./dist
