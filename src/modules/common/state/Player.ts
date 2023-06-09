import { Vec2FromStore, Vec2LargeType, Vec2SmallType } from "../Vec2.ts";
import {
  defaultEntityQueryOptions,
  defaultWorld,
  EntityId,
  IEntityPrefabCollection,
  IsDeletedStore,
  ProxyPool,
} from "./mod.ts";
import * as ECS from "bitecs";

export class PlayerProxy {
  readonly __eid: EntityId;
  /** _Center_ of player's body */
  readonly position: Vec2FromStore<{ x: "i32"; y: "i32" }>;
  readonly width = 16;
  readonly height = 32;
  readonly targetPosition: Vec2FromStore<{ x: "i32"; y: "i32" }>;
  readonly velocity: Vec2FromStore<{ x: "i8"; y: "i8" }>;
  readonly acceleration: Vec2FromStore<{ x: "i8"; y: "i8" }>;
  /** in 256ths of a pixel per millisecond */
  readonly maxVelocity = 33;
  readonly maxVelocitySq = this.maxVelocity ** 2;
  /** in 2**16ths of a pixel per millisecond */
  readonly friction = 80;
  constructor(eid: EntityId) {
    this.__eid = eid;
    // Don't overwrite value from ECS
    this.lastActiveTime = this.lastActiveTime || performance.now();
    this.position = new Vec2FromStore(PositionStore, eid);
    this.velocity = new Vec2FromStore(VelocityStore, eid);
    this.targetPosition = new Vec2FromStore(TargetPositionStore, eid);
    this.acceleration = new Vec2FromStore(AccelerationStore, eid);
  }

  get eid() {
    return this.__eid;
  }

  set lastActiveTime(time: number) {
    LastActiveStore.time[this.eid] = Math.round(time);
  }

  get lastActiveTime(): number {
    return LastActiveStore.time[this.eid];
  }

  get spriteMapId() {
    return SpriteMapIdStore.value[this.eid];
  }

  set spriteMapId(value: number) {
    SpriteMapIdStore.value[this.eid] = value;
  }

  get pose() {
    return PoseStore.value[this.eid] as PoseType;
  }

  set pose(pose: PoseType) {
    PoseStore.value[this.eid] = pose;
  }

  get isDeleted() {
    return ECS.hasComponent(defaultWorld, IsDeletedStore, this.eid);
  }
}

const PlayerTagStore = ECS.defineComponent();
const PositionStore = ECS.defineComponent(Vec2LargeType);
const TargetPositionStore = ECS.defineComponent(Vec2LargeType);
const VelocityStore = ECS.defineComponent(Vec2SmallType);
const AccelerationStore = ECS.defineComponent(Vec2SmallType);
// TODO remove
const LastActiveStore = ECS.defineComponent({ time: ECS.Types.ui32 });
const SpriteMapIdStore = ECS.defineComponent({ value: ECS.Types.ui8 });
const PoseStore = ECS.defineComponent({ value: ECS.Types.ui8 });

export enum PoseType {
  facingRight,
  facingLeft,
}

export enum MetaFlags {
  None = 0,
  Deleted = 1 << 0,
}

class PlayerStateApi implements IEntityPrefabCollection {
  world = defaultWorld;
  proxyPool = new ProxyPool((eid) => new PlayerProxy(eid));

  readonly components = [
    PlayerTagStore,
    PositionStore,
    TargetPositionStore,
    VelocityStore,
    AccelerationStore,
    LastActiveStore,
    SpriteMapIdStore,
    PoseStore,
  ];

  #playersIncludingDeleted = ECS.defineQuery(this.components);
  #players = ECS.defineQuery([...this.components, ECS.Not(IsDeletedStore)]);

  add(eid = ECS.addEntity(this.world) as EntityId): EntityId {
    for (const component of this.components) {
      ECS.addComponent(this.world, component, eid);
    }
    console.log(`Created player ${eid}`);
    return eid;
  }

  has(eid: EntityId) {
    return ECS.entityExists(this.world, eid) &&
      this.#players(this.world).includes(eid);
  }

  isDeleted(eid: EntityId): boolean {
    return ECS.hasComponent(this.world, IsDeletedStore, eid);
  }

  acquireProxy(
    eid: EntityId,
    options = defaultEntityQueryOptions,
  ): PlayerProxy {
    if (
      this.has(eid) &&
      (options.includeDeleted || !this.isDeleted(eid))
    ) {
      return this.proxyPool.acquire(eid);
    } else {
      throw new Error(`Entity ${eid} does not exist`);
    }
  }

  query(options = defaultEntityQueryOptions): Iterable<EntityId> {
    return (options.includeDeleted
      ? this.#playersIncludingDeleted(this.world)
      : this.#players(this.world)) as Iterable<EntityId>;
  }
}

export const PlayerState = new PlayerStateApi();
