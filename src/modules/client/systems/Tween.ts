import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TweenState } from "../state/Tween.ts";
import { filter } from "../../common/Iterable.ts";

function exec(context: ISystemExecutionContext) {
  // TODO tween should run for all entities, not just remote ones?
  for (const nid of ClientNetworkState.getRemoteIds()) {
    const lastReceivedSid = MessageState.getLastReceivedStepId(nid);
    if (lastReceivedSid > MessageState.getLastHandledStepId(nid)) {
      const remoteEntitySnapshots = filter(
        MessageState.getSnapshotsByCommandStepCreated(
          // TODO(bug) using lastReceivedSid - 1 here causes erratic movement
          lastReceivedSid,
          lastReceivedSid,
        ),
        ([_type, payload]) => payload.nid === nid,
      );

      for (const [msgType, payload] of remoteEntitySnapshots) {
        const eid = ClientNetworkState.getEntityId(payload.nid)!;
        for (const type of TweenState.mapMessageType(msgType)) {
          const tween = TweenState.get(type, eid);
          if (tween !== undefined) {
            TweenState.activate(tween, type.extractData(payload));
          }
        }
      }

      for (const type of TweenState.getTypes()) {
        for (const tween of TweenState.getActive(type)) {
          tween.exec(context);
        }
      }
      MessageState.setLastHandledStepId(nid, lastReceivedSid);
    }
  }
}

export const TweenSystem: SystemLoader = () => {
  return { exec };
};
