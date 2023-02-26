#!/bin/bash
mkdir -p ./dist/server \
  && cp -a ./src/server ./dist \
  && cp -a ./src/common ./dist \
  && cp ./import_map.json ./dist
