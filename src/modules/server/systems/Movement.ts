import { clampLine, getDistanceSquared } from "../../common/math.ts";
import {
  ColorChange,
  MessageType,
  PlayerMove,
  PlayerSnapshot,
} from "../../common/Message.ts";
import { MessageState } from "../../common/state/Message.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { ServerNetworkState } from "../../server/state/Network.ts";

const origin = Object.freeze(new Vec2(0, 0));

/** authoritative */
function handlePlayerMove({ delta, nid, sid }: PlayerMove) {
  const eid = ServerNetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    // TODO what if lastActiveTime is changed by more than just moving?
    const timeSinceLastMove = Time.elapsed * player.lastActiveTime;
    const clamped = getDistanceSquared(origin, delta) < player.MAX_VELOCITY_SQR
      ? to
      : clampLine(origin, delta, player.MAX_VELOCITY * timeSinceLastMove);

    player.position.add(clamped);
    player.lastActiveTime = Time.elapsed;
    MessageState.addSnapshot(
      MessageType.playerSnapshot,
      new PlayerSnapshot(player.position, nid, sid),
    );
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

function exec() {
  for (const [type, payload] of MessageState.getCommands()) {
    switch (type) {
      case MessageType.playerMoved:
        handlePlayerMove(payload as PlayerMove);
        break;
      case MessageType.colorChange:
        {
          const eid = ServerNetworkState.getEntityId(payload.nid);
          const player = PlayerState.getPlayer(eid!);
          player.color = (payload as ColorChange).color;
          player.lastActiveTime = Time.elapsed;
          MessageState.addSnapshot(MessageType.colorChange, payload);
        }
        break;
    }
  }
}

export const MovementSystem: SystemLoader = () => {
  return { exec };
};

const to = new Vec2();
