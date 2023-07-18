import * as Vec2 from "~/common/Vec2.ts";
import { OutputState } from "~/client/state/Output.ts";
import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { PI2, roundTo8thBit } from "../../common/math.ts";
import { ICloud, LevelState } from "../../common/state/LevelState.ts";
import { DebugState } from "../state/Debug.ts";
import { SpriteState } from "../state/Sprite.ts";

import { getFromCache } from "../../common/functions/image.ts";
import {
  CardinalDirection,
  detectTileCollision1d,
  SimulateOptions,
  TILE_SIZE,
} from "../../common/functions/physics.ts";
import { PhysicsState } from "../../common/state/Physics.ts";
import { EntityWithComponents, hasComponent } from "~/common/Component.ts";
import { GroundedTag, ShoulderCount } from "~/common/components.ts";
import { handleSpriteRequests } from "~/client/functions/sprite.ts";

export const OutputSystem: SystemLoader = async () => {
  await OutputState.ready;

  await handleSpriteRequests();

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

  await new FontFace("silkscreen", "url(/public/assets/Silkscreen-Regular.ttf)")
    .load()
    .then((font) => {
      document.fonts.add(font);
    });

  drawBackground();

  function exec(context: ISystemExecutionContext) {
    if (context.elapsedTime - lastRender >= frameDurationMin) {
      if (DebugState.enabled) {
        OutputState.frameCount++;
      }
      if (isRenderDataDirty() || DebugState.enabled) {
        eraseDynamicEntities();
        drawPlayers();
        DebugState.enabled && drawHelpers();
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

  drawTileLayer(ctx);

  if (DebugState.enabled) {
    drawCollisionDebug();
  }
}

function drawCollisionDebug() {
  const {
    background: { context2d: ctx },
  } = OutputState;
  const posPhysics = new Vec2.Instance();
  const options = new SimulateOptions();
  options.debug = true;

  // 1 x 1 tile
  // Vec2.set(options.hitBox, TILE_SIZE, TILE_SIZE);
  Vec2.set(options.hitBox, 1 << 8, 1 << 8);

  const step = TILE_SIZE >> 10;
  // move left to right, top to bottom one tile at a time, in px
  for (let yPx = 0; yPx < OutputState.foreground.resolution.y; yPx += step) {
    for (let xPx = 0; xPx < OutputState.foreground.resolution.x; xPx += step) {
      // convert to physics units
      Vec2.set(posPhysics, xPx << 8, yPx << 8);
      if (
        detectTileCollision1d(
          posPhysics,
          PhysicsState.tileMatrix,
          CardinalDirection.xMin,
          options,
        ) >= 0
      ) {
        ctx!.strokeStyle = "green";
        ctx!.beginPath();
        ctx!.moveTo(roundTo8thBit(posPhysics.x), roundTo8thBit(posPhysics.y));
        ctx!.lineTo(
          roundTo8thBit(posPhysics.x),
          roundTo8thBit(posPhysics.y) + step,
        );
        ctx!.stroke();
        ctx!.closePath();
      }
      if (
        detectTileCollision1d(
          posPhysics,
          PhysicsState.tileMatrix,
          CardinalDirection.yMax,
          options,
        ) >= 0
      ) {
        ctx!.strokeStyle = "yellow";
        ctx!.beginPath();
        ctx!.moveTo(roundTo8thBit(posPhysics.x), roundTo8thBit(posPhysics.y));
        ctx!.lineTo(
          roundTo8thBit(posPhysics.x) + step,
          roundTo8thBit(posPhysics.y),
        );
        ctx!.stroke();
        ctx!.closePath();
      }
      if (
        detectTileCollision1d(
          posPhysics,
          PhysicsState.tileMatrix,
          CardinalDirection.xMax,
          options,
        ) >= 0
      ) {
        ctx!.strokeStyle = "red";
        ctx!.beginPath();
        ctx!.moveTo(roundTo8thBit(posPhysics.x), roundTo8thBit(posPhysics.y));
        ctx!.lineTo(
          roundTo8thBit(posPhysics.x),
          roundTo8thBit(posPhysics.y) + step,
        );
        ctx!.stroke();
        ctx!.closePath();
      }
      if (
        detectTileCollision1d(
          posPhysics,
          PhysicsState.tileMatrix,
          CardinalDirection.yMin,
          options,
        ) >= 0
      ) {
        ctx!.strokeStyle = "purple";
        ctx!.beginPath();
        ctx!.moveTo(roundTo8thBit(posPhysics.x), roundTo8thBit(posPhysics.y));
        ctx!.lineTo(
          roundTo8thBit(posPhysics.x) + step,
          roundTo8thBit(posPhysics.y),
        );
        ctx!.stroke();
        ctx!.closePath();
      }
    }
  }
}

function drawTileLayer(ctx: CanvasRenderingContext2D) {
  for (const entity of OutputState.staticEntities.query()) {
    const image = getFromCache(entity.imageId);
    ctx.drawImage(image, entity.position.x, entity.position.y);
  }
}

function drawHelpers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;

  const entities = OutputState.dynamicEntities.query();
  for (const entity of entities) {
    const { x, y } = entity.targetPosition;
    const { x: w, y: h } = entity.bodyDimensions;
    const w2 = w >> 1;
    const h2 = h >> 1;
    const isGrounded = hasComponent(GroundedTag, entity);
    // woof
    const isShouldered = hasComponent(ShoulderCount, entity) &&
      (entity as unknown as EntityWithComponents<[typeof ShoulderCount]>)
          .shoulderCount > 0;

    ctx.beginPath();
    ctx.strokeStyle = isGrounded ? "red" : isShouldered ? "green" : "blue";
    ctx.ellipse(roundTo8thBit(x), roundTo8thBit(y), w2, h2, 0, 0, PI2);
    ctx.stroke();
    ctx.closePath();

    ctx.font = "10px silkscreen";
    ctx.fillText(
      entity.eid.toString(),
      roundTo8thBit(x) - w2,
      roundTo8thBit(y) - h2 - 3,
    );
  }
}

function isRenderDataDirty() {
  let isDirty = false;
  for (const entity of OutputState.dynamicEntities.query()) {
    if (
      entity.previousTargetPosition_output.x !==
        roundTo8thBit(entity.targetPosition.x) ||
      entity.previousTargetPosition_output.y !==
        roundTo8thBit(entity.targetPosition.y) ||
      entity.previousPosition.x !== roundTo8thBit(entity.position.x) ||
      entity.previousPosition.y !== roundTo8thBit(entity.position.y) ||
      entity.isSoftDeleted
    ) {
      isDirty = true;
      break;
    }
  }
  return isDirty;
}

function eraseDynamicEntities() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;
  for (const entity of OutputState.dynamicEntities.query()) {
    const sprite = SpriteState.find(entity.imageCollection, entity.pose)!;
    const { x: w, y: h } = entity.bodyDimensions;
    const w2 = w >> 1;
    const h2 = h >> 1;
    ctx.clearRect(
      entity.previousPosition.x - 2 - w2,
      entity.previousPosition.y - 14 - h2,
      sprite.width + 4 + w2,
      sprite.height + 4 + h2,
    );
    ctx.clearRect(
      entity.previousTargetPosition_output.x - 2 - w2,
      entity.previousTargetPosition_output.y - 2 - h2,
      sprite.width + 4 + w2,
      sprite.height + 4 + h2,
    );
    entity.previousPosition.x = roundTo8thBit(entity.position.x);
    entity.previousPosition.y = roundTo8thBit(entity.position.y);
    entity.previousTargetPosition_output.x = roundTo8thBit(
      entity.targetPosition.x,
    );
    entity.previousTargetPosition_output.y = roundTo8thBit(
      entity.targetPosition.y,
    );
  }
}

function drawPlayers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;
  for (const entity of OutputState.activeDynamicEntities.query()) {
    const sprite = SpriteState.find(entity.imageCollection, entity.pose)!;
    const { x: w, y: h } = entity.bodyDimensions;
    const w2 = w >> 1;
    const h2 = h >> 1;
    const image = getFromCache(sprite.imageId);
    ctx.drawImage(
      image,
      roundTo8thBit(entity.position.x) - w2,
      roundTo8thBit(entity.position.y) - h2,
    );
  }
}
