#!/bin/bash

mkdir -p ./bin

bun build --compile --minify --sourcemap --bytecode --target=bun-linux-x64 ./index.js --outfile bin/tufi
cd bin
tar -czf tufi-linux-amd64.tar.gz tufi

