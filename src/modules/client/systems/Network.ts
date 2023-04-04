import { SystemLoader } from "../../common/systems/mod.ts";
import { sendMessageToServer } from "../mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { MessagePlayloadByType, MessageType } from "../../common/Message.ts";
import { ClientNetworkState } from "../state/Network.ts";

interface Config {
  applyCommand: <Type extends MessageType>(
    type: Type,
    payload: MessagePlayloadByType[Type],
  ) => void;
  applySnapshot: <Type extends MessageType>(
    type: Type,
    payload: MessagePlayloadByType[Type],
  ) => void;
}

export const ClientNetworkSystem: SystemLoader<[Config]> = (
  { applyCommand, applySnapshot }: Config,
) => {
  function exec() {
    // TODO if there are no commands to send, maybe we don't need to increment step ID?
    for (const [type, payload] of MessageState.getUnsentCommands()) {
      sendMessageToServer(
        type,
        payload,
      );
      MessageState.lastSentStepId = payload.sid;
    }
    MessageState.incrementStepId();

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
            MessageState.lastReceivedStepId + 1,
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
  return { exec };
};
