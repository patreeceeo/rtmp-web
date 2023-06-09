import { PlayerState } from "~/common/state/Player.ts";
import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import * as ECS from "bitecs";
import { ProxyPool } from "../state/mod.ts";

const deletedEntityTimestamps: number[] = [];

export const PurgeSystem: SystemLoader<ISystemExecutionContext> = () => {
  function exec({ elapsedTime }: ISystemExecutionContext) {
    for (const eid of PlayerState.query({ includeDeleted: true })) {
      if (PlayerState.isDeleted(eid)) {
        deletedEntityTimestamps[eid] = deletedEntityTimestamps[eid] ||
          elapsedTime;
      }
      if (
        deletedEntityTimestamps[eid] &&
        elapsedTime - deletedEntityTimestamps[eid] > 500
      ) {
        console.log("Purging entity", eid);
        ECS.removeEntity(PlayerState.world, eid);
        delete deletedEntityTimestamps[eid];
        for (const pool of ProxyPool.registry) {
          pool.release(eid);
        }
      }
    }
  }
  return { exec };
};
