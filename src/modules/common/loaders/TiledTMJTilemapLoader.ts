import { decode } from "encoding/base64.ts";
import { dirname } from "path";
import { IReadonlyTilemap, Layer, Tile, Tilemap } from "../Tilemap.ts";
/**
 * @file Loads a JSON string from a Tiled TMJ file into a Tilemap object.
 */

interface ITilemapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: ReadonlyArray<ILayerJson>;
  tilesets: ReadonlyArray<ITilesetJson>;
}

interface ILayerJson {
  chunks: IChunkJson[];
}

interface IChunkJson {
  data: string;
  height: number;
  width: number;
  x: number;
  y: number;
  startx: number;
  starty: number;
}

interface ITilesetJson {
  name: string;
  image: string;
  imageheight: number;
  imagewidth: number;
  columns: number;
  firstgid: number;
  margin: number;
  spacing: number;
  tilecount: number;
  tileheight: number;
  tilewidth: number;
}

export async function loadTilemap(
  url: string,
  target = new Tilemap(),
): Promise<IReadonlyTilemap> {
  const json = await fetch(url).then((res) => res.json());
  await cacheImages(json, url);
  target.width = json.width;
  target.height = json.height;
  target.tileWidth = json.tilewidth;
  target.tileHeight = json.tileheight;

  for (let i = 0; i < json.layers.length; i++) {
    const layerJson = json.layers[i];
    target.layers[i] = loadLayer(layerJson, json.tilesets, target.layers[i]);
  }
  return target as IReadonlyTilemap;
}

// TODO create cache class
const imageCache: { [url: string]: HTMLImageElement } = {};

async function cacheImages(json: ITilemapJson, tilemapUrl: string) {
  const tilemapDir = dirname(tilemapUrl);
  const tilesetPaths = new Set(json.tilesets.map((tileset) => tileset.image));
  const promises = Array.from(tilesetPaths).map(
    (path) =>
      new Promise<void>((res) => {
        const img = new Image();
        img.onload = () => res();
        img.src = `${tilemapDir}/${path}`;
        imageCache[path] = img;
      }),
  );
  await Promise.all(promises);
}

function loadLayer(
  json: ILayerJson,
  jsonTilesets: ReadonlyArray<ITilesetJson>,
  target = new Layer(),
): Layer {
  let tileIndex = 0;
  for (let chunkIndex = 0; chunkIndex < json.chunks.length; chunkIndex++) {
    const chunk = json.chunks[chunkIndex];
    const u8Array = decode(chunk.data);
    const u32Array = new Uint32Array(u8Array.buffer);
    for (let u32Index = 0; u32Index < u32Array.length; u32Index++) {
      const mapX = chunk.x + (u32Index % chunk.width);
      const mapY = chunk.y + Math.floor(u32Index / chunk.width);
      // TODO store tiles in a 2d array?
      target.tiles[tileIndex] = loadTile(
        u32Array[u32Index],
        jsonTilesets,
        mapX,
        mapY,
        target.tiles[tileIndex],
      );
      tileIndex++;
    }
  }
  return target;
}

const GID_EMPTY = 0;
enum TileFlags {
  FLIPPED_HORIZONTALLY_FLAG = 0x80000000,
  FLIPPED_VERTICALLY_FLAG = 0x40000000,
  FLIPPED_DIAGONALLY_FLAG = 0x20000000,
  ALL_FLIP_FLAGS = TileFlags.FLIPPED_HORIZONTALLY_FLAG |
    TileFlags.FLIPPED_VERTICALLY_FLAG |
    TileFlags.FLIPPED_DIAGONALLY_FLAG,
}

const _canvasEl = document.createElement("canvas");

function loadTile(
  bits: number,
  tilesets: ReadonlyArray<ITilesetJson>,
  mapX: number,
  mapY: number,
  target = new Tile(),
) {
  const gid = bits & ~TileFlags.ALL_FLIP_FLAGS;

  if (gid === GID_EMPTY) {
    return undefined;
  } else {
    const flags = bits & TileFlags.ALL_FLIP_FLAGS;
    const flipH = isFlagSet(flags, TileFlags.FLIPPED_HORIZONTALLY_FLAG);
    const flipV = isFlagSet(flags, TileFlags.FLIPPED_VERTICALLY_FLAG);
    const flipD = isFlagSet(flags, TileFlags.FLIPPED_DIAGONALLY_FLAG);
    const tilesetIndex = getTilesetIndexForGid(tilesets, gid);
    const tileset = tilesets[tilesetIndex];
    const localId = getTileLocalId(gid, tileset.firstgid);
    const image = imageCache[tileset.image];
    const imageX = (localId % tileset.columns) * tileset.tilewidth;
    const imageY = Math.floor(localId / tileset.columns) * tileset.tileheight;
    const canvas = _canvasEl;

    canvas.width = tileset.tilewidth;
    canvas.height = tileset.tileheight;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (flipH) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    if (flipV) {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    if (flipD) {
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
    }
    ctx.drawImage(
      image,
      imageX,
      imageY,
      tileset.tilewidth,
      tileset.tileheight,
      0,
      0,
      tileset.tilewidth,
      tileset.tileheight,
    );

    target.image.src = canvas.toDataURL("image/png");
    target.screenX = mapX * tileset.tilewidth;
    target.screenY = mapY * tileset.tileheight;
    target.width = tileset.tilewidth;
    target.height = tileset.tileheight;

    return target;
  }
}

function isFlagSet(bits: number, flag: number) {
  return (bits & flag) !== 0;
}

/**
 * Returns the tile ID for a given gid. Assumes it is within range
 *
 * @param gid The global ID of the tile in a map.
 */
function getTileLocalId(gid: number, firstgid: number): number {
  return gid - firstgid;
}

function getTilesetIndexForGid(
  tilesets: ReadonlyArray<ITilesetJson>,
  gid: number,
) {
  for (let i = tilesets.length - 1; i >= 0; i--) {
    if (gid >= tilesets[i].firstgid) {
      return i;
    }
  }
  return -1;
}

// function debugEl(el: HTMLElement, x: number, y: number) {
//   el.style.position = "fixed";
//   el.style.zIndex = "1000";
//   el.style.left = x + "px";
//   el.style.top = y + "px";
//   document.body.appendChild(el);
// }
