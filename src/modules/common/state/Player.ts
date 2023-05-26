import { Vec2, Vec2LargeType, Vec2SmallType } from "../Vec2.ts";
import { defaultWorld, EntityId } from "./mod.ts";
import * as ECS from "bitecs";
import { BoxReadOnly } from "../Box.ts";
import { SUBPIXEL_SCALE } from "../constants.ts";
import { map } from "../Iterable.ts";

// TODO hitBox should be measured in pixels
const hitBox = new BoxReadOnly(0, 0, 16 * SUBPIXEL_SCALE, 32 * SUBPIXEL_SCALE);

export class Player {
  readonly hitBox = hitBox;
  readonly position: Vec2;
  readonly targetPosition: Vec2;
  readonly velocity: Vec2;
  readonly targetVelocity: Vec2;
  readonly acceleration: Vec2;
  /** in 256ths of a pixel per millisecond */
  readonly maxVelocity = 33;
  readonly maxVelocitySq = this.maxVelocity ** 2;
  /** in 2**16ths of a pixel per millisecond */
  readonly friction = 80;
  constructor(readonly eid: EntityId) {
    // Don't overwrite value from ECS
    this.lastActiveTime = this.lastActiveTime || performance.now();
    this.targetEntity = this.targetEntity ||
      (ECS.addEntity(defaultWorld) as EntityId);
    this.position = Vec2.fromEntityComponent(eid, PositionStore, "i32");
    this.velocity = Vec2.fromEntityComponent(eid, VelocityStore, "i8");
    this.targetPosition = Vec2.fromEntityComponent(
      this.targetEntity,
      PositionStore,
      "i32",
    );
    this.targetVelocity = Vec2.fromEntityComponent(
      this.targetEntity,
      VelocityStore,
      "i8",
    );
    this.acceleration = Vec2.fromEntityComponent(eid, AccelerationStore, "i8");
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
}

const PlayerTagStore = ECS.defineComponent();
const PositionStore = ECS.defineComponent(Vec2LargeType);
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

class PlayerStateApi {
  #players = ECS.defineQuery([PlayerTagStore]);
  world = defaultWorld;

  createPlayer(): Player {
    const eid = ECS.addEntity(this.world) as EntityId;
    console.log(`Created player ${eid}`);
    const player = new Player(eid);
    ECS.addComponent(this.world, PlayerTagStore, eid);
    ECS.addComponent(this.world, PositionStore, eid);
    ECS.addComponent(this.world, PositionStore, player.targetEntity);
    ECS.addComponent(this.world, VelocityStore, eid);
    ECS.addComponent(this.world, AccelerationStore, eid);
    ECS.addComponent(this.world, LastActiveStore, eid);
    ECS.addComponent(this.world, SpriteMapIdStore, eid);
    ECS.addComponent(this.world, PoseStore, eid);
    ECS.addComponent(this.world, MetaFlagsStore, eid);
    return player;
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

  getPlayer(eid: EntityId, options: IGetPlayerOptions = {}): Player {
    if (
      ECS.entityExists(this.world, eid) &&
      (options.includeDeleted ||
        (MetaFlagsStore.value[eid] & MetaFlags.Deleted) === 0)
    ) {
      return new Player(eid);
    } else {
      throw new Error(`Entity ${eid} does not exist`);
    }
  }

  *getEntityIds(options: IGetPlayerOptions = {}): Generator<EntityId> {
    for (const eid of this.#players(this.world)) {
      if (
        options.includeDeleted ||
        (MetaFlagsStore.value[eid] & MetaFlags.Deleted) === 0
      ) {
        yield eid as EntityId;
      }
    }
  }

  getPlayers(options: IGetPlayerOptions = {}): Generator<Player> {
    return map(
      this.getEntityIds(options),
      (eid) => this.getPlayer(eid, options),
    );
  }
}

export const PlayerState = new PlayerStateApi();
