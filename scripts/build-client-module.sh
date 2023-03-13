#!/bin/bash
echo "starting $1: $2 > $3"
screen -S "$1" -d -m npx tsc "$2" --outDir "$3" --lib esnext,dom --target esnext --module es2020 --watch
