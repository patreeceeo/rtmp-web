import { OutputState } from "../../client/state/Output.ts";
import { EntityPrefabCollection, IEntityBase } from "../Entity.ts";
import { isClient } from "../env.ts";
import { PhysicsState } from "./Physics.ts";
import { set } from "../Vec2.ts";
import {
  PlayerTag,
  PreviousTargetPositionComponent_Network,
  ShoulderCount,
  UuidComponent,
} from "../components.ts";
import { Player } from "../../../examples/platformer/common/constants.ts";

// TODO delete this file?

class PlayerStateApi {
  readonly components = [
    PlayerTag,
    ShoulderCount,
    UuidComponent,
    ...PhysicsState.dynamicEntityComponents,
    ...(isClient ? OutputState.dynamicEntityComponents : []),
    PreviousTargetPositionComponent_Network,
  ] as const;

  readonly entities = new EntityPrefabCollection(this.components);

  addPlayer(entity: IEntityBase) {
    const player = this.entities.add(entity);
    player.friction = Player.GROUND_FRICTION;
    set(player.bodyDimensions, Player.WIDTH, Player.HEIGHT);
    player.maxSpeed = Player.MAX_GROUND_SPEED;
    return player;
  }
}

export const PlayerState = new PlayerStateApi();
