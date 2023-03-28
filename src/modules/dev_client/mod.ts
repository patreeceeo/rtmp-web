import { basename, dirname } from 'path'
import * as esbuild from 'https://deno.land/x/esbuild@v0.17.12/mod.js'

function getOutPath(outDir: string, inPath: string) {
  const segments = inPath.split('/')
  const keepSegments = segments.slice(1, -1)
  const baseName = segments[segments.length - 1]
  const baseNameNoExt = basename(baseName, ".ts")
  return `${outDir}/${keepSegments.join('/')}/${baseNameNoExt}.js`
}

export async function buildModules(outDir: string, inPaths: Array<string>) {
  for(const inPath of inPaths) {
    await buildModule(outDir, inPath)
  }
}

export async function buildModule(outDir: string, inPath: string) {
  const outPath = getOutPath(outDir, inPath)
  Deno.mkdir(dirname(outPath), {recursive: true})
  const ts = await Deno.readTextFile(inPath)
  const result = await esbuild.transform(ts, { loader: 'ts' })
  esbuild.stop()
  console.log(`building ${inPath} => ${outPath}`)
  Deno.writeTextFile(outPath, result.code)
}
