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
    reconcileAndPredict(
      MessageType.playerSnapshot,
      MessageType.playerMoved,
      applyPlayerSnapshot,
      applyPlayerMoveCommand,
    );
    reconcileAndPredict(
      MessageType.colorChange,
      MessageType.colorChange,
      applyColorChange,
      applyColorChange,
    );
  }
}

// TODO unit test
function reconcileAndPredict<
  SnapshotType extends MessageType,
  CommandType extends MessageType,
>(
  snapshotType: SnapshotType,
  commandType: CommandType,
  applySnapshot: (payload: MessagePlayloadByType[SnapshotType]) => void,
  applyCommand: (payload: MessagePlayloadByType[CommandType]) => void,
) {
  const lastReceivedSid = MessageState.lastReceivedStepId;
  const lastSentSid = MessageState.lastSentStepId;
  const snapshots = MessageState.getSnapshots(
    lastReceivedSid,
    lastReceivedSid,
    (type, payload) =>
      ClientNetworkState.isLocal(payload.nid) &&
      // deno-lint-ignore no-explicit-any
      (type as any) === snapshotType,
  );

  for (const [_type, payload] of snapshots) {
    applySnapshot(payload as MessagePlayloadByType[SnapshotType]);
  }
  if (snapshots.length > 0) {
    for (
      const [_type, payload] of MessageState.getCommands(
        lastReceivedSid + 1,
        lastSentSid,
        // deno-lint-ignore no-explicit-any
        (type) => (type as any) === commandType,
      )
    ) {
      applyCommand(payload as MessagePlayloadByType[CommandType]);
    }
  }
}

function applyPlayerMoveCommand({ nid, delta }: PlayerMove) {
  const eid = ClientNetworkState.getEntityId(nid);
  // predict that the server will accept our moves
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    player.position.add(delta);
  }
}

function applyPlayerSnapshot({ nid, position }: PlayerSnapshot) {
  const eid = ClientNetworkState.getEntityId(nid)!;
  if (PlayerState.hasPlayer(eid)) {
    const player = PlayerState.getPlayer(eid);
    // Server sends back correct position
    player.position.copy(position);
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

function applyColorChange({ nid, color }: ColorChange) {
  const eid = ClientNetworkState.getEntityId(nid);
  // predict that the server will accept our moves
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    player.color = color;
  }
}

export const ClientMovementSystem: SystemLoader = () => {
  return { exec };
};
