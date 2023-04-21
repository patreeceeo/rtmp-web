import { ClientNetworkState } from "../../client/state/Network.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TweenState } from "../state/Tween.ts";
import { filter } from "../../common/Iterable.ts";

function exec() {
  const lastReceivedSid = MessageState.lastReceivedStepId;
  const remoteEntitySnapshots = filter(
    MessageState.getSnapshotsByCommandStepCreated(
      lastReceivedSid - 1,
      lastReceivedSid - 1,
    ),
    ([_type, payload]) => !ClientNetworkState.isLocal(payload.nid),
  );

  for (const [msgType, payload] of remoteEntitySnapshots) {
    const eid = ClientNetworkState.getEntityId(payload.nid)!;
    for (const type of TweenState.mapMessageType(msgType)) {
      const tween = TweenState.get(type, eid);
      if (tween !== undefined) {
        TweenState.activate(
          tween,
          type.extractData(payload),
        );
      }
    }
  }

  for (const type of TweenState.getTypes()) {
    for (const tween of TweenState.getActive(type)) {
      tween.exec(Time.delta);
    }
  }
}

export const TweenSystem: SystemLoader = () => {
  return { exec };
};
