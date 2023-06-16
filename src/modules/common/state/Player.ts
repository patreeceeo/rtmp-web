import { OutputState } from "../../client/state/Output.ts";
import { EntityPrefabCollection, IEntityMinimal } from "../Entity.ts";
import { isClient } from "../env.ts";
import { PhysicsState } from "./Physics.ts";
import { set } from "../Vec2.ts";

// TODO delete this file?

export enum PoseType {
  facingRight,
  facingLeft,
}

class PlayerStateApi {
  readonly components = [
    ...PhysicsState.components,
    ...(isClient ? OutputState.components : []),
  ] as const;

  readonly entities = new EntityPrefabCollection(this.components);

  addPlayer(entity: IEntityMinimal) {
    const player = this.entities.add(entity);
    player.friction = 80;
    set(player.bodyDimensions, 16, 32);
    player.maxSpeed = 99;
    return player;
  }
}

export const PlayerState = new PlayerStateApi();
