import { Vec2FromStore, Vec2LargeType, Vec2SmallType } from "../Vec2.ts";
import { defaultWorld, EntityId } from "./mod.ts";
import * as ECS from "bitecs";
import { BoxReadOnly } from "../Box.ts";
import { SUBPIXEL_SCALE } from "../constants.ts";
import { map } from "../Iterable.ts";

// TODO hitBox should be measured in pixels
const hitBox = new BoxReadOnly(0, 0, 16 * SUBPIXEL_SCALE, 32 * SUBPIXEL_SCALE);

export class PlayerProxy {
  readonly __eid: EntityId;
  readonly hitBox = hitBox;
  readonly position: Vec2FromStore<{ x: "i32"; y: "i32" }>;
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

  get targetEntity(): EntityId {
    return EntityStore.eid[this.eid] as EntityId;
  }

  set targetEntity(eid: EntityId) {
    EntityStore.eid[this.eid] = eid;
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
    return MetaFlagsStore.value[this.eid] & MetaFlags.Deleted;
  }
}

class PlayerProxyRecyclable extends PlayerProxy {
  override __eid: EntityId;
  constructor(eid: EntityId) {
    super(eid);
    this.__eid = eid;
  }

  get eid() {
    return this.__eid;
  }

  set eid(eid: EntityId) {
    this.__eid = eid;
    this.position.eid = eid;
    this.velocity.eid = eid;
    this.targetPosition.eid = eid;
    this.acceleration.eid = eid;
    this.lastActiveTime = this.lastActiveTime || performance.now();
  }
}

const PlayerTagStore = ECS.defineComponent();
const PositionStore = ECS.defineComponent(Vec2LargeType);
const TargetPositionStore = ECS.defineComponent(Vec2LargeType);
const VelocityStore = ECS.defineComponent(Vec2SmallType);
const AccelerationStore = ECS.defineComponent(Vec2SmallType);
const EntityStore = ECS.defineComponent({ eid: ECS.Types.ui32 });
// TODO remove
const LastActiveStore = ECS.defineComponent({ time: ECS.Types.ui32 });
const SpriteMapIdStore = ECS.defineComponent({ value: ECS.Types.ui8 });
const PoseStore = ECS.defineComponent({ value: ECS.Types.ui8 });
const MetaFlagsStore = ECS.defineComponent({ value: ECS.Types.ui8 });

export enum PoseType {
  facingRight,
  facingLeft,
}

export enum MetaFlags {
  None = 0,
  Deleted = 1 << 0,
}

export interface IGetPlayerOptions {
  includeDeleted?: boolean;
}

const defaultGetPlayerOptions: IGetPlayerOptions = {};

class PlayerStateApi {
  #players = ECS.defineQuery([PlayerTagStore]);
  #recyclableProxy = new PlayerProxyRecyclable(0 as EntityId);
  world = defaultWorld;

  createPlayer(): PlayerProxy {
    const eid = ECS.addEntity(this.world) as EntityId;
    console.log(`Created player ${eid}`);
    const player = new PlayerProxy(eid);
    ECS.addComponent(this.world, PlayerTagStore, eid);
    ECS.addComponent(this.world, PositionStore, eid);
    ECS.addComponent(this.world, TargetPositionStore, eid);
    ECS.addComponent(this.world, VelocityStore, eid);
    ECS.addComponent(this.world, AccelerationStore, eid);
    ECS.addComponent(this.world, LastActiveStore, eid);
    ECS.addComponent(this.world, SpriteMapIdStore, eid);
    ECS.addComponent(this.world, PoseStore, eid);
    ECS.addComponent(this.world, MetaFlagsStore, eid);
    return player;
  }

  get recyclableProxy() {
    return this.#recyclableProxy;
  }

  hasPlayer(eid: EntityId) {
    return ECS.entityExists(this.world, eid);
  }

  deletePlayer(eid: EntityId): void {
    console.log(`Deleted player ${eid}`);
    MetaFlagsStore.value[eid] |= MetaFlags.Deleted;
  }

  isDeleted(eid: EntityId): boolean {
    return (MetaFlagsStore.value[eid] & MetaFlags.Deleted) !== 0;
  }

  getPlayer(eid: EntityId, options = defaultGetPlayerOptions): PlayerProxy {
    if (
      ECS.entityExists(this.world, eid) &&
      (options.includeDeleted ||
        (MetaFlagsStore.value[eid] & MetaFlags.Deleted) === 0)
    ) {
      return new PlayerProxy(eid);
    } else {
      throw new Error(`Entity ${eid} does not exist`);
    }
  }

  *getEntityIds(
    options: IGetPlayerOptions = defaultGetPlayerOptions,
  ): Generator<EntityId> {
    for (const eid of this.#players(this.world)) {
      if (
        options.includeDeleted ||
        (MetaFlagsStore.value[eid] & MetaFlags.Deleted) === 0
      ) {
        yield eid as EntityId;
      }
    }
  }

  getPlayers(
    options: IGetPlayerOptions = defaultGetPlayerOptions,
  ): Generator<PlayerProxy> {
    return map(
      this.getEntityIds(options),
      (eid) => this.getPlayer(eid, options),
    );
  }
}

export const PlayerState = new PlayerStateApi();
