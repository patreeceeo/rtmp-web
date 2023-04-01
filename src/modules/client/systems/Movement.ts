// TODO make this an option arg
import { WORLD_DIMENSIONS } from "../../../examples/dots/mod.ts";
import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ColorChange,
  MessageType,
  PlayerMove,
  PlayerMoveMutable,
} from "~/common/Message.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { InputState } from "../../common/state/Input.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { sendMessageToServer } from "../mod.ts";
import { MessageState } from "../state/Message.ts";

/** authoritative */
export function applySnapshot(to: Vec2, nid: NetworkId) {
  const eid = ClientNetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    // Server sends back correct position
    player.position.copy(to);
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

const to = new Vec2();

function exec() {
  MessageState.incrementStepId();
  // loop thru local entities
  for (const eid of PlayerState.getPlayerEids()) {
    if (ClientNetworkState.isLocalEntity(eid)) {
      const player = PlayerState.getPlayer(eid);
      const nid = ClientNetworkState.getId(eid);
      const velocity = player.MAX_VELOCITY;
      const { x, y } = player.position;
      let dx = 0,
        dy = 0;
      if (InputState.isKeyPressed("KeyA") && x > player.width) {
        dx = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyW") && y > player.height) {
        dy = -1 * velocity * Time.delta;
      }
      if (
        InputState.isKeyPressed("KeyS") &&
        y < WORLD_DIMENSIONS.HEIGHT - player.height
      ) {
        dy = velocity * Time.delta;
      }
      if (
        InputState.isKeyPressed("KeyD") &&
        x < WORLD_DIMENSIONS.WIDTH - player.width
      ) {
        dx = velocity * Time.delta;
      }
      player.position.x += dx;
      player.position.y += dy;
      if (dx !== 0 || dy !== 0) {
        to.set(dx, dy);
        const move = new PlayerMove(to, nid!, MessageState.lastStepId);
        MessageState.pushUnsentCommand(MessageType.playerMoved, move);
      }

      if (InputState.isKeyPressed("KeyQ")) {
        player.color = player.color === 0 ? 6 : player.color - 1;
        sendMessageToServer(
          MessageType.colorChange,
          new ColorChange(player.color, nid!),
        );
      }
      if (InputState.isKeyPressed("KeyE")) {
        player.color = (player.color + 1) % 6;
        sendMessageToServer(
          MessageType.colorChange,
          new ColorChange(player.color, nid!),
        );
      }
    }
  }
}

export function applyPlayerMove(cmd: PlayerMove) {
  const eid = ClientNetworkState.getEntityId(cmd.nid);
  const player = PlayerState.getPlayer(eid!);
  player.position.add(cmd.delta);
}

export const ClientMovementSystem: SystemLoader = () => {
  return { exec, events: {} };
};

// TODO use a different type for server response because it's not a delta when
// coming from the server, it's an absolute position. Also, might have multiple
// types of messages for player moves being sent to the server (like duck, jump,
// etc), but the server only needs 1 type of message.
export function handleMoveFromServer(type: MessageType, payload: PlayerMove) {
  MessageState.pushSnapshot(type, payload);
}
