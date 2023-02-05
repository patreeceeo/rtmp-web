#!/bin/bash

mkdir -p ./dist/public \
  && cp ./src/index.html ./dist/public \
  && deno bundle ./src/client/mod.ts ./dist/public/client.bundle.js
