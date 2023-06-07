/**
 * @file Loads a JSON string from a Tiled TMJ file into a Tilemap object.
 */

import { Tilemap } from "../Tilemap.ts";

export async function loadTilemap(url: string): Promise<Tilemap> {
  const json = await fetch(url).then((res) => res.json());
  await Tilemap.cacheImages(json, url);
  return Tilemap.fromJson(json);
}
