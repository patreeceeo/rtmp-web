import { Reconciler } from "../../../modules/client/state/Reconcile.ts";
import {
  AccelerationComponent,
  PoseComponent,
  PositionComponent,
  SoftDeletedTag,
  TargetPositionComponent,
  VelocityComponent,
} from "../../../modules/common/components.ts";
import { Not } from "~/common/Query.ts";
import { IPlayerSnapshot } from "../common/message.ts";
import { copy, isZero } from "../../../modules/common/Vec2.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { EntityPrefabCollection } from "../../../modules/common/Entity.ts";
import { EntityWithComponents } from "~/common/EntityWithComponents.ts";

const PLAYER_SNAPSHOT_COMPONENTS = [
  Not(SoftDeletedTag),
  PositionComponent,
  TargetPositionComponent,
  PoseComponent,
  VelocityComponent,
  AccelerationComponent,
] as const;

export class PlayerSnapshotReconciler extends Reconciler<
  EntityWithComponents<typeof PLAYER_SNAPSHOT_COMPONENTS>,
  IPlayerSnapshot
> {
  entities = new EntityPrefabCollection(PLAYER_SNAPSHOT_COMPONENTS);
  #lastReconciledStep = 0;

  #shouldReconcile(
    player: EntityWithComponents<typeof PLAYER_SNAPSHOT_COMPONENTS>,
    { nid: sstNid, sid }: IPlayerSnapshot,
  ): boolean {
    const playerNid = NetworkState.getId(player.eid)!;
    return (
      (isZero(player.acceleration) ||
        !NetworkState.isLocal(playerNid)) &&
      playerNid === sstNid &&
      sid > this.#lastReconciledStep
    );
  }

  *query(sstPayload: IPlayerSnapshot) {
    for (const player of this.entities.query()) {
      if (this.#shouldReconcile(player, sstPayload)) {
        this.#lastReconciledStep = sstPayload.sid;
        yield player;
      }
    }
  }

  reconcile(
    player: EntityWithComponents<typeof PLAYER_SNAPSHOT_COMPONENTS>,
    { position, velocity, pose }: IPlayerSnapshot,
  ): void {
    const nid = NetworkState.getId(player.eid)!;
    copy(player.targetPosition, position);

    if (!NetworkState.isLocal(nid)) {
      copy(player.velocity, velocity);
    }
    player.pose = pose;
  }
}

/*
// An attempt at keeping the client and server simulations more in sync using rollback

 function rollback(
   entity: EntityWithComponents<typeof WASD_MOVE_COMPONENTS>,
   sid: number
 ) {
   const snapshots = MessageState.getSnapshotsByCommandStepCreated(sid);

   for (const [type, p] of snapshots) {
     if (type === PlayerSnapshot.type) {
       const s = p as IPlayerSnapshot;
       copy(entity.position, s.position);
       copy(entity.velocity, s.velocity);
       set(entity.acceleration, 0, 0);
     }
   }
 }

 const reuseTuple: Array<[number, IPayloadAny]> = [];

 function resimulate(
   entity: EntityWithComponents<typeof WASD_MOVE_COMPONENTS>,
   sid: number
 ) {
   const commands = MessageState.getCommandsByStepReceived(
     sid,
     MessageState.currentStep
   );
   const moveCommands = filter(commands, (c) => c[0] === PlayerMove.type);
   const moveCommandPairs = zip([moveCommands, tail(moveCommands)], reuseTuple);
   for (const [command, nextCommand] of moveCommandPairs) {
     const [_, p] = command;
     const [__, nextPayload] = nextCommand || [];
     const { acceleration, nid, sid } = p as IPlayerMove;
     const eid = NetworkState.getEntityId(nid);
     if (eid === entity.eid) {
       copy(entity.acceleration, acceleration);
     }
     const dt = (nextPayload ? nextPayload.sid : MessageState.currentStep) - sid;
     const options = getPhysicsOptions(
       castEntity(entity, PhysicsState.components)
     );
     simulateVelocityWithAcceleration(
       entity.velocity,
       entity.acceleration,
       dt,
       options
     );
     simulatePositionWithVelocity(entity.position, entity.velocity, dt, options);
   }
 }
 */
