import { basename, dirname } from "path";
import * as esbuild from "https://deno.land/x/esbuild@v0.17.12/mod.js";

function getOutPath(outDir: string, inPath: string) {
  const segments = inPath.split("/");
  const keepSegments = segments.slice(1, -1);
  const baseName = segments[segments.length - 1];
  const baseNameNoExt = basename(baseName, ".ts");
  return `${outDir}/${keepSegments.join("/")}/${baseNameNoExt}.js`;
}

interface BuildOptions {
  catchErrors?: boolean;
}

export async function buildModules(
  outDir: string,
  inPaths: Array<string>,
  options: BuildOptions = {},
) {
  for (const inPath of inPaths) {
    await buildModule(outDir, inPath, options);
  }
}

export async function buildModule(
  outDir: string,
  inPath: string,
  options: BuildOptions = {},
) {
  try {
    const outPath = getOutPath(outDir, inPath);
    Deno.mkdir(dirname(outPath), { recursive: true });
    const ts = await Deno.readTextFile(inPath);
    const result = await esbuild.transform(ts, { loader: "ts" });
    Deno.writeTextFile(outPath, result.code);
  } catch (e) {
    if (options.catchErrors) {
      console.error("while building", inPath, e);
    } else {
      throw e;
    }
  } finally {
    esbuild.stop();
  }
}
