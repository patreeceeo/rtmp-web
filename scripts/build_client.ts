#!/usr/bin/env -S deno run --allow-write --allow-read --allow-run --allow-env --allow-net

import { buildModule, buildModules } from '~/dev_client/mod.ts'
import { addModuleEventHandler, sleep } from '~/dev_common/mod.ts'

const outDir = Deno.args[0]
const inPaths = Deno.args[1].split(',')

await buildModules(outDir, inPaths)

if(Deno.args[2] === '--watch') {
  addModuleEventHandler(["create", "modify"], (inPaths) => {
    for(const inPath of inPaths) {
      buildModule(outDir, inPath)
    }
  }, ["src"])
  console.log("Watching for changes")
  sleep(Infinity)
}
