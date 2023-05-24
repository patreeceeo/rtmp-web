import { OutputState, PreviousPositionStore } from "~/client/state/Output.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { roundTo8thBit } from "../../common/math.ts";
import { ICloud, LevelState } from "../../common/state/LevelState.ts";
import { Vec2ReadOnly } from "../../common/Vec2.ts";
import { DebugState } from "../state/Debug.ts";
import { loadSprite, SpriteId, SpriteState } from "../state/Sprite.ts";

export const OutputSystem: SystemLoader = async () => {
  await OutputState.ready;

  await loadSprite("/public/assets/penguin.png", SpriteId.penguinRight, 16, 32);
  await loadSprite(
    "/public/assets/penguin.png",
    SpriteId.penguinLeft,
    16,
    32,
    true,
  );

  await loadSprite(
    "/public/assets/penguin2.png",
    SpriteId.penguin2Right,
    18,
    32,
  );
  await loadSprite(
    "/public/assets/penguin2.png",
    SpriteId.penguin2Left,
    18,
    32,
    true,
  );

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
        drawPlayers();
        DebugState.enabled && drawTweenHelpers();
        lastRender = context.elapsedTime;
      }
    }
  }

  return { exec };
};

function setupCanvas(el: HTMLCanvasElement, resolution: Vec2ReadOnly) {
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
    const { x0, y0, x1, y1, stops } = OutputState.gradients.get(key)!;
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
  resolution: Vec2ReadOnly,
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

  for (const [pathName, path] of OutputState.paths) {
    const gradient = getOrCreateLinearGradient(pathName, ctx);
    ctx.fillStyle = gradient;
    ctx.fill(path);
  }

  for (const cloud of LevelState.nearClouds) {
    drawCloud(cloud, ctx, resolution);
  }
}

function drawTweenHelpers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;

  const players = PlayerState.getPlayers();
  for (const player of players) {
    const { x, y } = player.targetPosition;
    const { h, w } = player.hitBox;
    ctx.strokeStyle = "red";
    ctx.strokeRect(
      roundTo8thBit(x),
      roundTo8thBit(y),
      roundTo8thBit(w),
      roundTo8thBit(h),
    );
  }
}

function isRenderDataDirty() {
  let isDirty = false;
  for (const player of PlayerState.getPlayers()) {
    if (
      PreviousPositionStore.x[player.eid] !==
        roundTo8thBit(player.position.x) ||
      PreviousPositionStore.y[player.eid] !== roundTo8thBit(player.position.y)
    ) {
      isDirty = true;
      break;
    }
  }
  return isDirty;
}

function drawPlayers() {
  const {
    foreground: { context2d },
  } = OutputState;
  const ctx = context2d!;
  for (const player of PlayerState.getPlayers()) {
    const { width, height } = SpriteState.find(
      player.spriteMapId,
      player.pose,
    )!;
    ctx.clearRect(
      PreviousPositionStore.x[player.eid],
      PreviousPositionStore.y[player.eid],
      width,
      height,
    );
    PreviousPositionStore.x[player.eid] = roundTo8thBit(player.position.x);
    PreviousPositionStore.y[player.eid] = roundTo8thBit(player.position.y);
  }
  for (const player of PlayerState.getPlayers()) {
    const sprite = SpriteState.find(player.spriteMapId, player.pose)!;
    ctx.drawImage(
      sprite.source,
      roundTo8thBit(player.position.x),
      roundTo8thBit(player.position.y),
    );
  }
}
