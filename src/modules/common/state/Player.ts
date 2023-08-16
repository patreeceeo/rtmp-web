import { EntityPrefabCollection } from "../Entity.ts";
import {
  BodyDimensions,
  LifeComponent,
  PlayerTag,
  PreviousTargetPositionComponent_Network,
  ShoulderCount,
  UuidComponent,
} from "../components.ts";
import { PhysicsState } from "~/common/state/Physics.ts";
import { isClient } from "~/common/env.ts";
import { OutputState } from "~/client/state/Output.ts";

// TODO delete this file?

class PlayerStateApi {
  readonly entities = new EntityPrefabCollection([
    PlayerTag,
    LifeComponent,
    ShoulderCount,
    UuidComponent,
    BodyDimensions,
    PreviousTargetPositionComponent_Network,
    ...PhysicsState.keneticEntities.components,
    ...(isClient ? OutputState.activeDynamicEntities.components : []),
  ]);
}

export const PlayerState = new PlayerStateApi();
