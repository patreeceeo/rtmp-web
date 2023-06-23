import { isClient } from "../env.ts";

export async function isomorphic(url: string): Promise<Response> {
  if (isClient) {
    return await fetch(url);
  } else {
    const rootDir = Deno.cwd();
    const assetPath = `${rootDir}${url}`;
    const content = await Deno.readFile(assetPath);
    return new Response(content);
  }
}
