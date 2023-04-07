import { ClientNetworkState } from "../../client/state/Network.ts";
import {
  AnyMessagePayload,
  ColorChange,
  MessagePlayloadByType,
  MessageType,
  PlayerMove,
  PlayerSnapshot,
} from "~/common/Message.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { AnyTrait, TraitState } from "../state/Trait.ts";
import { isJust, Just, Maybe, unboxJust } from "../../common/state/mod.ts";

function exec() {
  const traitCommandMaybes: Array<[AnyTrait, Maybe<AnyMessagePayload>]> = [];
  for (const trait of TraitState.getAll()) {
    traitCommandMaybes.push([trait, trait.getCommand()]);
  }

  const traitCommands: Array<[AnyTrait, AnyMessagePayload]> = traitCommandMaybes
    .filter(([_t, p]) => isJust(p))
    .map(([t, p]) => [t, unboxJust(p as Just<AnyMessagePayload>)]);

  for (const [trait, payload] of traitCommands) {
    TraitState.getType(trait.type).applyCommand(payload);
  }
  for (const [trait, payload] of traitCommands) {
    MessageState.addCommand(trait.mType, payload);
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

export const TraitSystem: SystemLoader = () => {
  return { exec };
};
