import { OutputState } from "~/client/state/Output.ts";
import { PlayerState } from "~/common/state/Player.ts";
import { SystemLoader } from "~/common/systems/mod.ts";
import { drawCircle } from "~/client/canvas.ts";

function exec() {
  drawPlayers();
}
export const OutputSystem: SystemLoader = async () => {
  await OutputState.ready;

  const { canvas: { resolution } } = OutputState;

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
  return { exec };
};

function drawPlayers() {
  const { canvas: { resolution, context2d } } = OutputState;
  const ctx = context2d!;
  ctx.clearRect(0, 0, resolution.x, resolution.y);
  for (const player of PlayerState.getPlayers()) {
    ctx.fillStyle = player.webColor;
    drawCircle(ctx, player.position.x, player.position.y, 4);
  }
}
