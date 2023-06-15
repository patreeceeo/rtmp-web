import * as Vec2 from "~/common/Vec2.ts";
import { OutputState } from "~/client/state/Output.ts";
import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { loadTilemap } from "../../common/loaders/TiledTMJTilemapLoader.ts";
import { roundTo8thBit } from "../../common/math.ts";
import { ICloud, LevelState } from "../../common/state/LevelState.ts";
import { DebugState } from "../state/Debug.ts";
import { loadSprite, SpriteEnum, SpriteState } from "../state/Sprite.ts";
import { Layer as TilemapLayer } from "../../common/Tilemap.ts";

export const OutputSystem: SystemLoader = async () => {
  await OutputState.ready;

  await loadSprite(
    "/public/assets/penguin.png",
    SpriteEnum.penguinRight,
    16,
    32,
  );
  await loadSprite(
    "/public/assets/penguin.png",
    SpriteEnum.penguinLeft,
    16,
    32,
    true,
  );

  await loadSprite(
    "/public/assets/penguin2.png",
    SpriteEnum.penguin2Right,
    18,
    32,
  );
  await loadSprite(
    "/public/assets/penguin2.png",
    SpriteEnum.penguin2Left,
    18,
    32,
    true,
  );

  await loadTilemap("/public/assets/level.json", OutputState.scene.tiles);

  const {
    foreground: { resolution },
  } = OutputState;

  OutputState.foreground.element = document.querySelector("#foreground")!;
  OutputState.background.element = document.querySelector("#background")!;

  setupCanvas(OutputState.foreground.element, resolution);
  setupCanvas(OutputState.background.element, resolution);

  OutputState.foreground.clientRect = OutputState.foreground.element
    .getBoundingClientRect();

  const foregroundCtx = OutputState.foreground.element.getContext("2d")!;
  if (foregroundCtx) {
    OutputState.foreground.context2d = foregroundCtx;
  } else {
    throw new Error("Failed to get foreground rendering context");
  }

  const backgroundCtx = OutputState.background.element.getContext("2d")!;
  if (backgroundCtx) {
    OutputState.background.context2d = backgroundCtx;
  } else {
    throw new Error("Failed to get background rendering context");
  }

  const fpsSlider = document.querySelector("#fps-slider")!;
  let fpsLimit = parseInt(localStorage.getItem("fpsLimit") || "40", 10);

  fpsSlider.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    fpsLimit = parseInt(target.value, 10);
    frameDurationMin = 1000 / fpsLimit;
    localStorage.setItem("fpsLimit", fpsLimit.toString());
    console.info(`FPS limit: ${fpsLimit}`);
  });

  fpsSlider.setAttribute("value", fpsLimit.toString());

  let frameDurationMin = 1000 / fpsLimit;
  let lastRender = -frameDurationMin;

  drawBackground();

  function exec(context: ISystemExecutionContext) {
    if (context.elapsedTime - lastRender >= frameDurationMin) {
      if (DebugState.enabled) {
        OutputState.frameCount++;
      }
      if (isRenderDataDirty()) {
        erasePlayers();
        DebugState.enabled && drawTweenHelpers();
        drawPlayers();
        lastRender = context.elapsedTime;
      }
    }
  }

  return { exec };
};

function setupCanvas(el: HTMLCanvasElement, resolution: Vec2.ReadOnly) {
  // Get the DPR and size of the canvas
  const dpr = 2 ** Math.ceil(Math.log2(window.devicePixelRatio));

  el.width = resolution.x * dpr;
  el.height = resolution.y * dpr;

  const ctx = el.getContext("2d")!;
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);
  }
}

const gradients = new Map<string, CanvasGradient>();
function getOrCreateLinearGradient(key: string, ctx: CanvasRenderingContext2D) {
  let gradient = gradients.get(key);
  if (!gradient) {
    const { x0, y0, x1, y1, stops } = OutputState.scene.gradients.get(key)!;
    gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [offset, color] of stops) {
      gradient.addColorStop(offset, color);
    }
    gradients.set(key, gradient);
  }
  return gradient;
}

const PI2 = 2 * Math.PI;

function drawCloud(
  cloud: ICloud,
  ctx: CanvasRenderingContext2D,
  resolution: Vec2.ReadOnly,
) {
  const { position, size } = cloud;
  const yFlipped = resolution.y - position.y;
  const xRadius = size.x >> 1;
  const yRadius = size.y >> 1;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(position.x, yFlipped + yRadius, xRadius, yRadius, 0, 0, PI2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    position.x + size.x,
    yFlipped + yRadius,
    xRadius,
    yRadius,
    0,
    0,
    PI2,
  );
  ctx.fill();
  ctx.fillRect(position.x, yFlipped, size.x, size.y);
}

function drawBackground() {
  const {
    background: { resolution, context2d },
  } = OutputState;
  const ctx = context2d!;
  const skyGradient = getOrCreateLinearGradient("sky", ctx);

  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, resolution.x, resolution.y);

  for (const cloud of LevelState.farClouds) {
    drawCloud(cloud, ctx, resolution);
  }

  for (const [pathName, path] of OutputState.scene.paths) {
    const gradient = getOrCreateLinearGradient(pathName, ctx);
    ctx.fillStyle = gradient;
    ctx.fill(path);
  }

  for (const cloud of LevelState.nearClouds) {
    drawCloud(cloud, ctx, resolution);
  }

  for (const layer of OutputState.scene.tiles.layers) {
    drawTileLayer(layer, ctx);
  }
}

function drawTileLayer(layer: TilemapLayer, ctx: CanvasRenderingContext2D) {
  for (const tile of layer.tiles) {
    if (tile) {
      ctx.drawImage(
        tile.image,
        tile.screenX,
        tile.screenY,
        tile.width,
        tile.height,
      );
    }
  }
}

function drawTweenHelpers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;

  const entities = OutputState.entities.query();
  for (const entity of entities) {
    const { x, y } = entity.targetPosition;
    const { x: w, y: h } = entity.physicalSize;
    const w2 = w >> 1;
    const h2 = h >> 1;
    ctx.strokeStyle = "red";
    ctx.strokeRect(roundTo8thBit(x) - w2, roundTo8thBit(y) - h2, w, h);
  }
}

function isRenderDataDirty() {
  let isDirty = false;
  for (const entity of OutputState.entities.query()) {
    if (
      entity.previousPosition.x !==
        roundTo8thBit(entity.position.x) ||
      entity.previousPosition.y !==
        roundTo8thBit(entity.position.y) ||
      entity.isSoftDeleted
    ) {
      isDirty = true;
      break;
    }
  }
  return isDirty;
}

function erasePlayers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;
  for (const entity of OutputState.entities.query()) {
    const sprite = SpriteState.find(entity.spriteSheet, entity.pose)!;
    const { x: w, y: h } = entity.physicalSize;
    const w2 = w >> 1;
    const h2 = h >> 1;
    ctx.clearRect(
      entity.previousPosition.x - 2 - w2,
      entity.previousPosition.y - 2 - h2,
      sprite.width + 4 + w2,
      sprite.height + 4 + h2,
    );
    entity.previousPosition.x = roundTo8thBit(entity.position.x);
    entity.previousPosition.y = roundTo8thBit(entity.position.y);
  }
}

function drawPlayers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;
  for (const entity of OutputState.entities.query()) {
    const sprite = SpriteState.find(entity.spriteSheet, entity.pose)!;
    const { x: w, y: h } = entity.physicalSize;
    const w2 = w >> 1;
    const h2 = h >> 1;
    ctx.drawImage(
      sprite.source,
      roundTo8thBit(entity.position.x) - w2,
      roundTo8thBit(entity.position.y) - h2,
    );
  }
}
