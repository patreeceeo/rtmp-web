import { decode } from "encoding/base64.ts";
import { dirname } from "path";

const GID_EMPTY = 0;

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

export class Tilemap {
  static imageCache: { [url: string]: HTMLImageElement } = {};

  static async cacheImages(json: ITilemapJson, tilemapUrl: string) {
    const tilemapDir = dirname(tilemapUrl);
    const tilesetPaths = new Set(json.tilesets.map((tileset) => tileset.image));
    const promises = Array.from(tilesetPaths).map(
      (path) =>
        new Promise<void>((res) => {
          const img = new Image();
          img.onload = () => res();
          img.src = `${tilemapDir}/${path}`;
          this.imageCache[path] = img;
        }),
    );
    await Promise.all(promises);
  }
  static fromJson(json: ITilemapJson) {
    const width = json.width;
    const height = json.height;
    const tileWidth = json.tilewidth;
    const tileHeight = json.tileheight;
    const layers = json.layers.map((layer) =>
      TilemapLayer.fromJson(layer, json.tilesets)
    );

    return new Tilemap(width, height, tileWidth, tileHeight, layers);
  }

  private constructor(
    readonly width: number,
    readonly height: number,
    readonly tileWidth: number,
    readonly tileHeight: number,
    readonly layers: ReadonlyArray<TilemapLayer>,
  ) {}
}

export class TilemapLayer {
  static fromJson(
    json: ILayerJson,
    jsonTilesets: ReadonlyArray<ITilesetJson>,
  ) {
    const tiles = [];
    for (const chunk of json.chunks) {
      const u8Array = decode(chunk.data);
      const u32Array = new Uint32Array(u8Array.buffer);
      for (let i = 0; i < u32Array.length; i++) {
        const mapX = chunk.x + (i % chunk.width);
        const mapY = chunk.y + Math.floor(i / chunk.width);
        tiles.push(
          DrawableData.fromBits(u32Array[i], jsonTilesets, mapX, mapY),
        );
      }
    }
    return new TilemapLayer(tiles);
  }

  private constructor(readonly tiles: ReadonlyArray<DrawableData | null>) {}
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

class DrawableData {
  static canvasEl = document.createElement("canvas");
  static FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
  static FLIPPED_VERTICALLY_FLAG = 0x40000000;
  static FLIPPED_DIAGONALLY_FLAG = 0x20000000;
  static ALL_FLIP_FLAGS = this.FLIPPED_HORIZONTALLY_FLAG |
    this.FLIPPED_VERTICALLY_FLAG |
    this.FLIPPED_DIAGONALLY_FLAG;
  static fromBits(
    bits: number,
    tilesets: ReadonlyArray<ITilesetJson>,
    mapX: number,
    mapY: number,
  ) {
    const gid = bits & ~this.ALL_FLIP_FLAGS;

    if (gid === GID_EMPTY) {
      return null;
    } else {
      const flags = bits & this.ALL_FLIP_FLAGS;
      const flipH = isFlagSet(flags, this.FLIPPED_HORIZONTALLY_FLAG);
      const flipV = isFlagSet(flags, this.FLIPPED_VERTICALLY_FLAG);
      const flipD = isFlagSet(flags, this.FLIPPED_DIAGONALLY_FLAG);
      const tilesetIndex = getTilesetIndexForGid(tilesets, gid);
      const tileset = tilesets[tilesetIndex];
      const localId = getTileLocalId(gid, tileset.firstgid);
      const image = Tilemap.imageCache[tileset.image];
      const imageX = (localId % tileset.columns) * tileset.tilewidth;
      const imageY = Math.floor(localId / tileset.columns) * tileset.tileheight;
      const canvas = DrawableData.canvasEl;

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

      const tileImage = new Image();
      tileImage.src = canvas.toDataURL("image/png");

      return new DrawableData(
        tileImage,
        mapX * tileset.tilewidth,
        mapY * tileset.tileheight,
        tileset.tilewidth,
        tileset.tileheight,
      );
    }
  }

  private constructor(
    readonly image: HTMLImageElement,
    readonly screenX: number,
    readonly screenY: number,
    readonly width: number,
    readonly height: number,
  ) {}
}

function debugEl(el: HTMLElement, x: number, y: number) {
  el.style.position = "fixed";
  el.style.zIndex = "1000";
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
}
