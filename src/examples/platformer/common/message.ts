import {
  IBufferProxyObjectSpec,
  PrimitiveValue,
  ValueBoxStacker,
  Vec2LargeSpec,
  Vec2SmallSpec,
} from "../../../modules/common/BufferValue.ts";
import { defMessageType } from "../../../modules/common/Message.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { Vec2 } from "../../../modules/common/Vec2.ts";
import { PoseType } from "../../../modules/common/state/Player.ts";
import { IPingMsg, PingMsgSpec } from "../../../modules/common/state/Ping.ts";

export enum MsgType {
  nil,
  ping,
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
  props: {
    sid: stack.box(PrimitiveValue.StepId),
    nid: stack.box(PrimitiveValue.NetworkId),
  },
};

defMessageType<INilPayload>(MsgType.nil, NilPayloadSpec);

interface IPlayerAdd extends INilPayload {
  position: Vec2;
  spriteMapId: number;
  isLocal: boolean;
}

defMessageType<IPingMsg>(MsgType.ping, PingMsgSpec);

const playerAddStack = stack.fork();
const PlayerAddSpec: IBufferProxyObjectSpec<IPlayerAdd> = {
  props: Object.assign(
    {},
    NilPayloadSpec.props,
    {
      position: playerAddStack.box(Vec2LargeSpec),
      spriteMapId: playerAddStack.box(PrimitiveValue.Uint8),
      isLocal: playerAddStack.box(PrimitiveValue.Bool),
    },
  ),
};

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
const PlayerSnapshotSpec: IBufferProxyObjectSpec<IPlayerSnapshot> = {
  props: Object.assign({}, NilPayloadSpec.props, {
    position: playerSnapshotStack.box(Vec2LargeSpec),
    velocity: playerSnapshotStack.box(Vec2SmallSpec),
    pose: playerSnapshotStack.box(PrimitiveValue.Uint8),
  }),
};

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
const PlayerMoveSpec: IBufferProxyObjectSpec<IPlayerMove> = {
  props: Object.assign(
    {},
    NilPayloadSpec.props,
    {
      acceleration: playerMoveStack.box(Vec2SmallSpec),
    },
  ),
};

const PlayerMove = defMessageType<IPlayerMove>(
  MsgType.playerMoved,
  PlayerMoveSpec,
);

interface INegotiatePhysics extends INilPayload {
  position: Vec2;
  velocity: Vec2;
}

const negotiateStack = stack.fork();
const NegotiatePhysicsSpec: IBufferProxyObjectSpec<INegotiatePhysics> = {
  props: Object
    .assign({}, NilPayloadSpec.props, {
      position: negotiateStack.box(Vec2LargeSpec),
      velocity: negotiateStack.box(Vec2SmallSpec),
    }),
};

const NegotiatePhysics = defMessageType<INegotiatePhysics>(
  MsgType.negotiatePhysics,
  NegotiatePhysicsSpec,
);
