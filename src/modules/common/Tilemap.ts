export interface IReadonlyTilemap {
  readonly width: number;
  readonly height: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly layers: ReadonlyArray<IReadonlyLayer>;
}

export interface IReadonlyLayer {
  readonly tiles: ReadonlyArray<IReadonlyTile | undefined>;
}

export interface IReadonlyTile {
  readonly image: Readonly<HTMLImageElement>;
  readonly screenX: number;
  readonly screenY: number;
  readonly width: number;
  readonly height: number;
}

export class Tilemap {
  constructor(
    public width = 0,
    public height = 0,
    public tileWidth = 0,
    public tileHeight = 0,
    public layers: Array<Layer> = [],
  ) {}
}

export class Layer {
  constructor(public tiles: Array<Tile | undefined> = []) {}
}

export class Tile {
  constructor(
    public image = new Image(),
    public screenX = 0,
    public screenY = 0,
    public width = 0,
    public height = 0,
  ) {}
}
