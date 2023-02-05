#!/bin/bash
mkdir -p ./dist/server \
  && cp ./src/server ./dist -a \
  && cp ./src/common ./dist -a \
  && cp ./import_map.json ./dist
