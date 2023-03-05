#!/bin/bash
screen -d -m npx esbuild "$1" --outfile="$2" --platform=neutral --format=esm --target=esnext --watch
