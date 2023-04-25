#!/usr/bin/env -S deno run --allow-write --allow-read --allow-run --allow-env --allow-net

import { buildModule, buildModules } from "~/dev_client/mod.ts";
import { addModuleEventHandler, sleep } from "~/dev_common/mod.ts";

const outDir = Deno.args[0];
const inPaths = Deno.args[1].split(",");
const replaceImportMapPath = Deno.args[2];
const watchMode = Deno.args[3] === "--watch";
const inlineSourcemap = Deno.args[4] === "--inline-sourcemap";

const buildOptions = {
  catchErrors: watchMode,
  replaceImports: replaceImportMapPath !== null,
  importMapPath: replaceImportMapPath,
  sourcemap: inlineSourcemap ? "inline" as const : false,
};

await buildModules(outDir, inPaths, buildOptions);

function getTimeString() {
  const d = new Date();
  return d.toLocaleTimeString();
}

if (watchMode) {
  addModuleEventHandler(["create", "modify"], (inPaths) => {
    for (const inPath of inPaths) {
      buildModule(outDir, inPath, buildOptions);
      console.log(`[${getTimeString()}] built ${inPath}`);
    }
  }, ["src"]);
  console.log("Watching for changes");
  sleep(Infinity);
}
