import { OutputState } from "~/client/state/Output.ts";
import { PlayerState, PoseType } from "~/common/state/Player.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { roundTo8thBit } from "../../common/math.ts";
import { ICloud, LevelState } from "../../common/state/LevelState.ts";
import { Vec2ReadOnly } from "../../common/Vec2.ts";
import { DebugState } from "../state/Debug.ts";
import { Sprite, SpriteId, SpriteState } from "../state/Sprite.ts";

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
    canvas: { resolution },
  } = OutputState;

  const el: HTMLCanvasElement = document.querySelector("#screen")!;
  el.width = resolution.x;
  el.height = resolution.y;
  OutputState.canvas.element = el;
  OutputState.canvas.clientRect = el.getBoundingClientRect();
  const ctx = el.getContext("2d")!;
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    OutputState.canvas.context2d = ctx;
  } else {
    throw new Error("Failed to get canvas rendering context");
  }

  function exec() {
    drawBackground();
    drawPlayers();
    DebugState.enabled && drawTweenHelpers();
  }
  return { exec };
};

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
    canvas: { resolution, context2d },
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
    canvas: { context2d },
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

function drawPlayers() {
  const {
    canvas: { context2d },
  } = OutputState;
  const ctx = context2d!;
  for (const player of PlayerState.getPlayers()) {
    const sprite = SpriteState.find(player.spriteMapId, player.pose)!;
    ctx.drawImage(
      sprite.source,
      roundTo8thBit(player.position.x),
      roundTo8thBit(player.position.y),
    );
  }
}

async function loadSprite(
  src: string,
  id: number,
  width: number,
  height: number,
  flipped = false,
) {
  const sprite = new Sprite(src, width, height, flipped);
  SpriteState.set(id, sprite);
  const source = SpriteState.getSource(sprite.imageUrl);
  await new Promise((resolve) => (source.onload = resolve));
  const context = sprite.source.getContext("2d")!;
  if (sprite.mirror) {
    context.scale(-1, 1);
    context.translate(-sprite.width, 0);
  }

  context.drawImage(
    source,
    0,
    0,
    sprite.width,
    sprite.height,
    0,
    0,
    sprite.width,
    sprite.height,
  );
}
