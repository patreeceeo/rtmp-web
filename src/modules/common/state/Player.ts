import { Vec2, Vec2Type } from "../Vec2.ts";
import { defaultWorld, EntityId } from "./mod.ts";
import * as ECS from "bitecs";
import { BoxReadOnly } from "../Box.ts";

export enum ColorId {
  RED,
  ORANGE,
  YELLOW,
  GREEN,
  BLUE,
  INDIGO,
  VIOLET,
}

const webColors = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "violet",
];

export class Player {
  readonly hitBox = new BoxReadOnly(0, 0, 16, 32);
  readonly position: Vec2;
  readonly targetPosition: Vec2;
  readonly velocity: Vec2;
  readonly acceleration: Vec2;
  readonly maxVelocity = 0.2;
  readonly maxVelocitySq = this.maxVelocity ** 2;
  readonly friction = 0.0004;
  constructor(readonly eid: EntityId) {
    // Don't overwrite value from ECS
    this.lastActiveTime = this.lastActiveTime || performance.now();
    this.targetEntity = this.targetEntity ||
      ECS.addEntity(defaultWorld) as EntityId;
    this.position = Vec2.fromEntityComponent(eid, PositionStore);
    this.velocity = Vec2.fromEntityComponent(eid, VelocityStore);
    this.targetPosition = Vec2.fromEntityComponent(
      this.targetEntity,
      PositionStore,
    );
    this.acceleration = Vec2.fromEntityComponent(eid, AccelerationStore);
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

  get timeWarp(): number {
    return TimeWarpStore.value[this.eid];
  }

  set timeWarp(value: number) {
    TimeWarpStore.value[this.eid] = value;
  }

  get color(): ColorId {
    return ColorStore.value[this.eid] as ColorId;
  }

  set color(cid: ColorId) {
    ColorStore.value[this.eid] = cid;
  }

  get webColor() {
    return webColors[this.color];
  }

  get pose() {
    return PoseStore.value[this.eid] as PoseType;
  }

  set pose(pose: PoseType) {
    PoseStore.value[this.eid] = pose;
  }

  get snapshot() {
    return {
      eid: this.eid,
      position: this.position.snapshot,
      lastActiveTime: this.lastActiveTime,
    };
  }

  applySnapshot(snap: typeof this.snapshot) {
    this.position.applySnapshot(snap.position);
    this.lastActiveTime = snap.lastActiveTime;
  }
}

const PlayerTagStore = ECS.defineComponent();
const PositionStore = ECS.defineComponent(Vec2Type);
const VelocityStore = ECS.defineComponent(Vec2Type);
const AccelerationStore = ECS.defineComponent(Vec2Type);
const EntityStore = ECS.defineComponent({ eid: ECS.Types.ui32 });
// TODO remove
const LastActiveStore = ECS.defineComponent({ time: ECS.Types.ui32 });
const ColorStore = ECS.defineComponent({ value: ECS.Types.ui8 });
const PoseStore = ECS.defineComponent({ value: ECS.Types.ui8 });
const TimeWarpStore = ECS.defineComponent({ value: ECS.Types.i8 });

export enum PoseType {
  facingLeft,
  facingRight,
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
    ECS.addComponent(this.world, ColorStore, eid);
    ECS.addComponent(this.world, PoseStore, eid);
    ECS.addComponent(this.world, TimeWarpStore, eid);
    return player;
  }

  hasPlayer(eid: EntityId) {
    return ECS.entityExists(this.world, eid);
  }

  deletePlayer(eid: EntityId): void {
    console.log(`Deleted player ${eid}`);
    ECS.removeEntity(this.world, eid);
  }

  getPlayer(eid: EntityId): Player {
    if (ECS.entityExists(this.world, eid)) {
      return new Player(eid);
    } else {
      throw new Error(`Entity ${eid} does not exist`);
    }
  }

  getEntityIds(): Array<EntityId> {
    return this.#players(this.world) as Array<EntityId>;
  }

  getPlayers(): Array<Player> {
    return this.getEntityIds().map((eid) => this.getPlayer(eid));
  }

  get snapshot() {
    const snap: Array<typeof Player.prototype.snapshot> = [];
    for (const player of PlayerState.getPlayers()) {
      snap[player.eid] = player.snapshot;
    }
    return snap;
  }

  applySnapshot(snap: typeof this.snapshot) {
    for (const playerSnapshot of snap) {
      this.getPlayer(playerSnapshot.eid).applySnapshot(playerSnapshot);
    }
  }

  /**
  * work in progress
  getDiff(before: typeof this.snapshot, after: typeof this.snapshot) {
    const diff = {
      create: {},
      update: {},
      delete: [] as EntityId[],
    }
    const longestKeys = before.length > after.length ? before.keys() : after.keys()

    for(const key of longestKeys) {
      if(key in before && !(key in after)) {
        diff.delete.push(key as EntityId)
      }
    }
  }
  */
}

export const PlayerState = new PlayerStateApi();
