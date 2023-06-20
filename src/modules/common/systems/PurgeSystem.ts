import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { deleteEntity, EntityPrefabCollection } from "../Entity.ts";
import { SoftDeletedTag } from "../components.ts";

// TODO purge state api?
const deletedEntityTimestamps: number[] = [];
const entities = new EntityPrefabCollection([SoftDeletedTag]);

export const PurgeSystem: SystemLoader<ISystemExecutionContext> = () => {
  function exec({ elapsedTime }: ISystemExecutionContext) {
    for (const entity of entities.query()) {
      const eid = entity.eid;
      if (
        eid in deletedEntityTimestamps
      ) {
        if (
          elapsedTime - deletedEntityTimestamps[eid] > 500
        ) {
          deleteEntity(eid);
          delete deletedEntityTimestamps[eid];
        }
      } else {
        deletedEntityTimestamps[eid] = elapsedTime;
      }
    }
  }
  return { exec };
};
