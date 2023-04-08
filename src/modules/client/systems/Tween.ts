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

// TODO use polymorphism to make system code more generic
function exec() {
  const lastReceivedSid = MessageState.lastReceivedStepId;
  const remoteEntitySnapshots = MessageState.getSnapshots(
    lastReceivedSid,
    lastReceivedSid,
    (_type, payload) => !ClientNetworkState.isLocal(payload.nid),
  );

  for (const [type, payload] of remoteEntitySnapshots) {
    const eid = ClientNetworkState.getEntityId(payload.nid)!;
    const tweenTypes = message2TweenType(type);
    for (const tweenType of tweenTypes) {
      if (TweenState.has(eid, tweenType)) {
        TweenState.activate(
          eid,
          tweenType,
          message2TweenData(tweenType, payload),
        );
      }
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
  for (const tween of TweenState.getActive(TweenType.pose)) {
    const player = PlayerState.getPlayer(tween.eid);
    player.pose = tween.end;
  }
}

function applyColor(eid: EntityId, color: ColorId) {
  const player = PlayerState.getPlayer(eid!);
  player.color = color;
}

function message2TweenType<Type extends MessageType>(type: Type) {
  switch (type) {
    case MessageType.playerSnapshot:
      return [TweenType.position, TweenType.pose];
    case MessageType.colorChange:
      return [TweenType.color];
    default:
      throw new Error("unhandled case");
  }
}
function message2TweenData<Type extends MessageType>(
  type: TweenType,
  payload: MessagePlayloadByType[Type],
) {
  switch (type) {
    case TweenType.position:
      return (payload as PlayerSnapshot).position;
    case TweenType.color:
      return (payload as ColorChange).color;
    case TweenType.pose:
      return (payload as PlayerSnapshot).pose;
    default:
      throw new Error("unhandled case");
  }
}

export const TweenSystem: SystemLoader = () => {
  return { exec };
};
