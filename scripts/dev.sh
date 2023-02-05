#!/bin/bash

cp ./src/index.html ./public \
  && deno bundle --watch ./src/client/mod.ts ./public/client.bundle.js &
deno run --allow-net --allow-read --watch ./src/server/mod.ts
