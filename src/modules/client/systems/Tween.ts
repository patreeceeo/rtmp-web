import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TweenState } from "../state/Tween.ts";
import { filter } from "../../common/Iterable.ts";

function exec(context: ISystemExecutionContext) {
  for (const nid of ClientNetworkState.getAllIds()) {
    const eid = ClientNetworkState.getEntityId(nid)!;
    const lastReceivedSid = MessageState.getLastReceivedStepId(nid);
    if (lastReceivedSid > MessageState.getLastHandledStepId(nid)) {
      const snapshots = filter(
        MessageState.getSnapshotsByCommandStepCreated(
          // TODO(bug) using lastReceivedSid - 1 here causes erratic movement
          lastReceivedSid,
          lastReceivedSid,
        ),
        ([_type, payload]) => payload.nid === nid,
      );

      for (const [msgType, payload] of snapshots) {
        for (const type of TweenState.mapMessageType(msgType)) {
          const tween = TweenState.get(type, eid);
          if (tween !== undefined) {
            TweenState.activate(tween, type.extractData(payload));
          }
        }
      }

      MessageState.setLastHandledStepId(nid, lastReceivedSid);
    }
    for (const type of TweenState.getTypes()) {
      for (const tween of TweenState.getActive(type)) {
        tween.exec(context);
        if (tween.isComplete) {
          TweenState.deactivate(tween);
        }
      }
    }
  }
}

export const TweenSystem: SystemLoader = () => {
  return { exec };
};
