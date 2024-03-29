import { decode } from "encoding/base64.ts";
import { dirname } from "path";
import { Box } from "../Box.ts";
import { addComponents } from "../Component.ts";
import {
  BodyDimensions,
  BodyStaticTag,
  ImageIdComponent,
  PositionComponent,
  TileTag,
} from "../components.ts";
import { addEntity } from "../Entity.ts";
import { isomorphic as isomorphicFetch } from "../functions/fetch.ts";
import { incrementId } from "../functions/id.ts";
import {
  getChunk,
  getFromCache,
  ImageOptions,
  loadFromUrl,
  LoadOptions,
  setCache,
} from "../functions/image.ts";
import { set } from "../Vec2.ts";
/**
 * @file Loads a JSON string from a Tiled TMJ file into a Tilemap object.
 */
const TILE_COMPONENTS = [
  TileTag,
  ImageIdComponent,
  PositionComponent,
  BodyStaticTag,
  BodyDimensions,
] as const;

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

const GID_EMPTY = 0;
enum TileFlags {
  FLIPPED_HORIZONTALLY_FLAG = 0x80000000,
  FLIPPED_VERTICALLY_FLAG = 0x40000000,
  FLIPPED_DIAGONALLY_FLAG = 0x20000000,
  ALL_FLIP_FLAGS = TileFlags.FLIPPED_HORIZONTALLY_FLAG |
    TileFlags.FLIPPED_VERTICALLY_FLAG |
    TileFlags.FLIPPED_DIAGONALLY_FLAG,
}

const _imageSourceBox = new Box();
const _imageOptions = new ImageOptions();
const _loadImageOptions = new LoadOptions();

export async function loadTilemap(
  url: string,
  loadVisuals = true,
): Promise<void> {
  const json = await isomorphicFetch(url).then((res) => res.json());
  const promises = [];

  if (loadVisuals) {
    await cacheImages(json, url);
  }

  for (let i = 0; i < json.layers.length; i++) {
    const layerJson = json.layers[i];
    promises.push(loadLayer(layerJson, json.tilesets, loadVisuals));
  }
  await Promise.all(promises);
}

async function cacheImages(json: ITilemapJson, tilemapUrl: string) {
  const tilemapDir = dirname(tilemapUrl);
  const tilesetPaths = new Set(json.tilesets.map((tileset) => tileset.image));
  const promises = Array.from(tilesetPaths).map((relPath) => {
    _loadImageOptions.reset();
    _loadImageOptions.cacheKey = relPath;
    return loadFromUrl(`${tilemapDir}/${relPath}`, _loadImageOptions);
  });
  await Promise.all(promises);
}

async function loadLayer(
  json: ILayerJson,
  jsonTilesets: ReadonlyArray<ITilesetJson>,
  loadVisuals = true,
): Promise<void> {
  const promises: Array<Promise<void>> = [];
  for (let chunkIndex = 0; chunkIndex < json.chunks.length; chunkIndex++) {
    const chunk = json.chunks[chunkIndex];
    const u8Array = decode(chunk.data);
    const u32Array = new Uint32Array(u8Array.buffer);
    for (let u32Index = 0; u32Index < u32Array.length; u32Index++) {
      const mapX = chunk.x + (u32Index % chunk.width);
      const mapY = chunk.y + Math.floor(u32Index / chunk.width);
      promises.push(loadTile(
        u32Array[u32Index],
        jsonTilesets,
        mapX,
        mapY,
        loadVisuals,
      ));
    }
  }
  await Promise.all(promises);
}

const tileCacheKeys: Record<number, number> = {};

async function loadTile(
  bits: number,
  tilesets: ReadonlyArray<ITilesetJson>,
  mapX: number,
  mapY: number,
  loadVisuals = true,
): Promise<void> {
  const gid = bits & ~TileFlags.ALL_FLIP_FLAGS;

  if (gid === GID_EMPTY) {
    return undefined;
  } else {
    const tileEntity = addComponents(
      TILE_COMPONENTS,
      addEntity(),
    );
    const tilesetIndex = getTilesetIndexForGid(tilesets, gid);
    const tileset = tilesets[tilesetIndex];

    if (loadVisuals) {
      let imageId: number;

      if (tileCacheKeys[bits] !== undefined) {
        imageId = tileCacheKeys[bits];
      } else {
        const flags = bits & TileFlags.ALL_FLIP_FLAGS;

        const localId = getTileLocalId(gid, tileset.firstgid);
        const image = getFromCache(tileset.image);
        const imageX = (localId % tileset.columns) * tileset.tilewidth;
        const imageY = Math.floor(localId / tileset.columns) *
          tileset.tileheight;
        _imageSourceBox.set(
          imageX,
          imageY,
          tileset.tilewidth,
          tileset.tileheight,
        );

        _imageOptions.reset();
        _imageOptions.flipH = isFlagSet(
          flags,
          TileFlags.FLIPPED_HORIZONTALLY_FLAG,
        );
        _imageOptions.flipV = isFlagSet(
          flags,
          TileFlags.FLIPPED_VERTICALLY_FLAG,
        );
        _imageOptions.flipD = isFlagSet(
          flags,
          TileFlags.FLIPPED_DIAGONALLY_FLAG,
        );
        _imageOptions.target = new Image();

        imageId = incrementId("image");
        tileCacheKeys[bits] = imageId;
        const chunk = await getChunk(image, _imageSourceBox, _imageOptions);

        setCache(imageId, chunk);
      }

      tileEntity.imageId = imageId;
    }

    // TODO tilePosition should be a component
    set(
      tileEntity.position,
      mapX * tileset.tilewidth,
      mapY * tileset.tileheight,
    );
    set(tileEntity.bodyDimensions, tileset.tilewidth, tileset.tileheight);
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
