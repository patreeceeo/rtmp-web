#!/bin/bash
echo "starting $1: $2 > $3"
screen -S "$1" -d -m npx esbuild "$2" --outfile="$3" --platform=neutral --format=esm --target=esnext --watch
