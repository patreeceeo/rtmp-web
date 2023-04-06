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
import { ColorId, PlayerState } from "../../common/state/Player.ts";
import { InputState } from "../../common/state/Input.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { clampLine } from "../../common/math.ts";
import { TweenState, TweenType } from "../state/Tween.ts";
import { EntityId } from "../../common/state/mod.ts";

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
        MessageState.addCommand(
          MessageType.colorChange,
          new ColorChange(player.color, nid!, MessageState.lastStepId),
        );
      }
      if (InputState.isKeyPressed("KeyE")) {
        player.color = (player.color + 1) % 6;
        MessageState.addCommand(
          MessageType.colorChange,
          new ColorChange(player.color, nid!, MessageState.lastStepId),
        );
      }
    }
  }

  const lastReceivedSid = MessageState.lastReceivedStepId;
  const lastSentSid = MessageState.lastSentStepId;
  if (lastReceivedSid < lastSentSid) {
    const localEntitySnapshots = MessageState.getSnapshots(
      lastReceivedSid,
      lastReceivedSid,
      (_type, payload) => ClientNetworkState.isLocal(payload.nid),
    );

    for (const [snapshotType, snapshotPayload] of localEntitySnapshots) {
      applySnapshot(snapshotType, snapshotPayload);
    }
    for (
      const [type, payload] of MessageState.getCommandSlice(
        lastReceivedSid + 1,
        lastSentSid,
      )
    ) {
      // predict that the server will accept our moves
      applyCommand(type, payload);
    }
  }

  const remoteEntitySnapshots = MessageState.getSnapshots(
    lastReceivedSid,
    lastReceivedSid,
    (_type, payload) => !ClientNetworkState.isLocal(payload.nid),
  );

  for (const [type, payload] of remoteEntitySnapshots) {
    const eid = ClientNetworkState.getEntityId(payload.nid)!;
    const tweenType = message2TweenType(type);
    if (TweenState.has(eid, tweenType)) {
      TweenState.activate(eid, tweenType, message2TweenData(type, payload));
    }
  }

  for (const tween of TweenState.getActive(TweenType.position)) {
    const player = PlayerState.getPlayer(tween.eid);
    const mid = clampLine(
      player.position,
      tween.end,
      player.MAX_VELOCITY * Time.delta,
    );
    if (player) {
      player.position.copy(mid);
    }
  }
  for (const tween of TweenState.getActive(TweenType.color)) {
    applyColor(tween.eid, tween.end);
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
  const eid = ClientNetworkState.getEntityId(payload.nid)!;

  switch (type) {
    case MessageType.playerSnapshot:
      {
        if (PlayerState.hasPlayer(eid)) {
          const player = PlayerState.getPlayer(eid);
          // Server sends back correct position
          player.position.copy((payload as PlayerSnapshot).position);
        } else {
          console.warn(
            `Requested moving unknown player with nid ${payload.nid}`,
          );
        }
      }
      break;
    case MessageType.colorChange:
      {
        applyColor(eid, (payload as ColorChange).color);
      }
      break;
  }
}

function applyColor(eid: EntityId, color: ColorId) {
  const player = PlayerState.getPlayer(eid!);
  player.color = color;
}

function message2TweenType<Type extends MessageType>(type: Type) {
  switch (type) {
    case MessageType.playerSnapshot:
      return TweenType.position;
    case MessageType.colorChange:
      return TweenType.color;
    default:
      throw new Error("unhandled case");
  }
}
function message2TweenData<Type extends MessageType>(
  type: Type,
  payload: MessagePlayloadByType[Type],
) {
  switch (type) {
    case MessageType.playerSnapshot:
      return (payload as PlayerSnapshot).position;
    case MessageType.colorChange:
      return (payload as ColorChange).color;
    default:
      throw new Error("unhandled case");
  }
}

export const ClientMovementSystem: SystemLoader = () => {
  return { exec };
};
