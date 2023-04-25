import { basename, dirname } from "path";
import * as esbuild from "https://deno.land/x/esbuild@v0.17.12/mod.js";
import {
  init,
  parse,
} from "https://ga.jspm.io/npm:es-module-lexer@1.2.1/dist/lexer.js";

function getOutPath(outDir: string, inPath: string) {
  const segments = inPath.split("/");
  const keepSegments = segments.slice(1, -1);
  const baseName = segments[segments.length - 1];
  const baseNameNoExt = basename(baseName, ".ts");
  return `${outDir}/${keepSegments.join("/")}/${baseNameNoExt}.js`;
}

interface BuildOptions {
  catchErrors?: boolean;
  replaceImports?: boolean;
  importMapPath?: string;
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

await init;
export async function buildModule(
  outDir: string,
  inPath: string,
  options: BuildOptions = {},
) {
  try {
    const outPath = getOutPath(outDir, inPath);
    Deno.mkdir(dirname(outPath), { recursive: true });
    const ts = await Deno.readTextFile(inPath);
    const esBuildResult = await esbuild.transform(ts, {
      loader: "ts",
      target: ["safari14"],
    });
    let result = esBuildResult.code;
    if (options.replaceImports) {
      const importMap = JSON.parse(
        await Deno.readTextFile(options.importMapPath!),
      );
      result = replaceImports(result, importMap.imports);
    }
    Deno.writeTextFile(outPath, result);
  } catch (e) {
    console.error("while building", inPath, e);
    if (!options.catchErrors) {
      throw e;
    }
  } finally {
    esbuild.stop();
  }
}

/** Replaces bare import specifiers in the given ES module source code with the
 * corresponding URLs in the given ImportMap.
 *
 * @param source The ES module source code.
 * @param importMap The ImportMap object.
 * @returns The modified source code.
 */
function replaceImports(
  source: string,
  importMap: Record<string, string>,
): string {
  // Parse the source code with es-module-lexer to identify all import specifiers
  const [imports] = parse(source);

  let result = source;
  let offset = 0;

  // Loop through each import specifier
  for (const imp of imports) {
    // Ignore dynamic import specifiers (they have `imp.d > -1`)
    if (imp.d === -1) {
      // Extract the specifier string from the source code
      const specifier = source.slice(imp.s, imp.e);
      let newSpecifier: string | null = null;

      // Check if the specifier is a bare import specifier and has a corresponding URL in the ImportMap
      const mapped = importMap[specifier];
      if (mapped) {
        // Replace the specifier with the corresponding URL in the modified source code
        newSpecifier = mapped;
      } else {
        // Check if the specifier matches a key in the ImportMap with a trailing slash
        const matchingKeys = Object.keys(importMap).filter((key) =>
          specifier.startsWith(key) && key.endsWith("/")
        );
        if (matchingKeys.length > 0) {
          // Find the longest matching key
          const matchingKey = matchingKeys.reduce(
            (prev, curr) => (prev.length > curr.length ? prev : curr),
            "",
          );
          // Replace the matched part of the specifier with the corresponding value in the ImportMap
          newSpecifier = importMap[matchingKey] +
            specifier.slice(matchingKey.length);
        }
      }

      if (newSpecifier !== null) {
        // Replace the specifier with the modified specifier in the source code
        result = result.slice(0, imp.s + offset) + newSpecifier +
          result.slice(imp.e + offset);
        offset += newSpecifier.length - specifier.length;
      }
    }
  }

  return result;
}
