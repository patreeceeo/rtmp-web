import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { deleteEntity, EntityPrefabCollection } from "../Entity.ts";
import { SoftDeletedTag } from "../components.ts";

// TODO purge state api?
const deletedEntityTimestamps: number[] = [];
const entities = new EntityPrefabCollection([SoftDeletedTag]);
const queryOptions = { includeSoftDeleted: true };

export const PurgeSystem: SystemLoader<ISystemExecutionContext> = () => {
  function exec({ elapsedTime }: ISystemExecutionContext) {
    for (const entity of entities.query(queryOptions)) {
      const eid = entity.eid;
      if (
        eid in deletedEntityTimestamps &&
        elapsedTime - deletedEntityTimestamps[eid] > 500
      ) {
        console.log("Purging entity", eid);
        deleteEntity(eid);
        delete deletedEntityTimestamps[eid];
      } else {
        deletedEntityTimestamps[eid] = elapsedTime;
      }
    }
  }
  return { exec };
};
