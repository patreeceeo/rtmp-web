import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ColorChange,
  MessagePlayloadByType,
  MessageType,
  PlayerSnapshot,
} from "~/common/Message.ts";
import { ColorId, PlayerState } from "../../common/state/Player.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { clampLine } from "../../common/math.ts";
import { TweenState, TweenType } from "../state/Tween.ts";
import { EntityId } from "../../common/state/mod.ts";

function exec() {
  const lastReceivedSid = MessageState.lastReceivedStepId;
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

export const TweenSystem: SystemLoader = () => {
  return { exec };
};
