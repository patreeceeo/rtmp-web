import {
  IBufferProxyObjectSpec,
  PrimitiveValue,
  ValueBoxStacker,
  Vec2LargeProxy,
  Vec2SmallProxy,
} from "../../../modules/common/BufferValue.ts";
import { defMessageType } from "../../../modules/common/Message.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { Vec2 } from "../../../modules/common/Vec2.ts";
import { PoseType } from "../../../modules/common/state/Player.ts";

export enum MsgType {
  nil,
  playerAdded,
  playerMoved,
  playerRemoved,
  playerSnapshot,
  negotiatePhysics,
}

export type {
  INegotiatePhysics,
  IPlayerAdd,
  IPlayerMove,
  IPlayerRemove,
  IPlayerSnapshot,
};

export {
  NegotiatePhysics,
  PlayerAdd,
  PlayerMove,
  PlayerRemove,
  PlayerSnapshot,
};

interface INilPayload {
  nid: NetworkId;
  sid: number;
}

const stack = new ValueBoxStacker();
const NilPayloadSpec: IBufferProxyObjectSpec<INilPayload> = {
  nid: stack.box(PrimitiveValue.NetworkId),
  sid: stack.box(PrimitiveValue.StepId),
};

defMessageType<INilPayload>(MsgType.nil, NilPayloadSpec);

interface IPlayerAdd extends INilPayload {
  position: Vec2;
  isLocal: boolean;
}

const playerAddStack = stack.fork();
const PlayerAddSpec: IBufferProxyObjectSpec<IPlayerAdd> = Object.assign(
  {},
  NilPayloadSpec,
  {
    position: playerAddStack.box(Vec2LargeProxy),
    isLocal: playerAddStack.box(PrimitiveValue.Bool),
  },
);

const PlayerAdd = defMessageType<IPlayerAdd>(
  MsgType.playerAdded,
  PlayerAddSpec,
);

// TODO(perf) maybe this should be broken up into two messages
interface IPlayerSnapshot extends INilPayload {
  position: Vec2;
  velocity: Vec2;
  pose: PoseType;
}

const playerSnapshotStack = stack.fork();
const PlayerSnapshotSpec: IBufferProxyObjectSpec<IPlayerSnapshot> = Object
  .assign({}, NilPayloadSpec, {
    position: playerSnapshotStack.box(Vec2LargeProxy),
    velocity: playerSnapshotStack.box(Vec2SmallProxy),
    pose: playerSnapshotStack.box(PrimitiveValue.Uint8),
  });

const PlayerSnapshot = defMessageType<IPlayerSnapshot>(
  MsgType.playerSnapshot,
  PlayerSnapshotSpec,
);

type IPlayerRemove = INilPayload;

const PlayerRemoveSpec = NilPayloadSpec;

const PlayerRemove = defMessageType<IPlayerRemove>(
  MsgType.playerRemoved,
  PlayerRemoveSpec,
);

interface IPlayerMove extends INilPayload {
  acceleration: Vec2;
}

const playerMoveStack = stack.fork();
const PlayerMoveSpec: IBufferProxyObjectSpec<IPlayerMove> = Object.assign(
  {},
  NilPayloadSpec,
  {
    acceleration: playerMoveStack.box(Vec2SmallProxy),
  },
);

const PlayerMove = defMessageType<IPlayerMove>(
  MsgType.playerMoved,
  PlayerMoveSpec,
);

interface INegotiatePhysics extends INilPayload {
  position: Vec2;
  velocity: Vec2;
}

const negotiateStack = stack.fork();
const NegotiatePhysicsSpec: IBufferProxyObjectSpec<INegotiatePhysics> = Object
  .assign({}, NilPayloadSpec, {
    position: negotiateStack.box(Vec2LargeProxy),
    velocity: negotiateStack.box(Vec2SmallProxy),
  });

const NegotiatePhysics = defMessageType<INegotiatePhysics>(
  MsgType.negotiatePhysics,
  NegotiatePhysicsSpec,
);
