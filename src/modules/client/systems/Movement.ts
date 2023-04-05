// TODO make this an option arg
import { WORLD_DIMENSIONS } from "../../../examples/dots/mod.ts";
import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ColorChange,
  MessagePlayloadByType,
  MessageType,
  PlayerMove,
  PlayerSnapshot,
} from "~/common/Message.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { InputState } from "../../common/state/Input.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { sendMessageToServer } from "./Network.ts";

const to = new Vec2();

function exec() {
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
        MessageState.addCommand(MessageType.playerMoved, move);
      }

      if (InputState.isKeyPressed("KeyQ")) {
        player.color = player.color === 0 ? 6 : player.color - 1;
        sendMessageToServer(
          MessageType.colorChange,
          new ColorChange(player.color, nid!, MessageState.lastStepId),
        );
      }
      if (InputState.isKeyPressed("KeyE")) {
        player.color = (player.color + 1) % 6;
        sendMessageToServer(
          MessageType.colorChange,
          new ColorChange(player.color, nid!, MessageState.lastStepId),
        );
      }
    }
  }

  const lastReceivedSid = MessageState.lastReceivedStepId;
  for (
    const [snapshotType, snapshotPayload] of MessageState.getSnapshotSlice(
      lastReceivedSid,
      lastReceivedSid,
    )
  ) {
    applySnapshot(snapshotType, snapshotPayload);
    if (lastReceivedSid < MessageState.lastSentStepId) {
      for (
        const [type, payload] of MessageState.getCommandSlice(
          lastReceivedSid + 1,
          MessageState.lastSentStepId,
        )
      ) {
        if (ClientNetworkState.isLocal(payload.nid)) {
          // predict that the server will accept our moves
          applyCommand(type, payload);
        }
      }
    }
  }
}

function applyCommand<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  const eid = ClientNetworkState.getEntityId(payload.nid);

  switch (type) {
    case MessageType.playerMoved: {
      if (PlayerState.hasPlayer(eid!)) {
        const player = PlayerState.getPlayer(eid!);
        player.position.add((payload as PlayerMove).delta);
      }
      break;
    }
  }
}

/** authoritative */
function applySnapshot<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  const eid = ClientNetworkState.getEntityId(payload.nid);

  switch (type) {
    case MessageType.playerSnapshot: {
      if (PlayerState.hasPlayer(eid!)) {
        const player = PlayerState.getPlayer(eid!);
        // Server sends back correct position
        player.position.copy((payload as PlayerSnapshot).position);
      } else {
        console.warn(`Requested moving unknown player with nid ${payload.nid}`);
      }
      break;
    }
  }
}

export const ClientMovementSystem: SystemLoader = () => {
  return { exec };
};
