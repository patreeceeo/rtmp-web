import { PoseType } from "~/client/functions/sprite.ts";
import {
  IBufferProxyObjectSpec,
  PrimitiveValue,
  ValueBoxStacker,
  Vec2LargeSpec,
  Vec2SmallSpec,
} from "../../../modules/common/BufferValue.ts";
import { defMessageType } from "../../../modules/common/Message.ts";
import { Uuid } from "../../../modules/common/NetworkApi.ts";
import { Instance } from "../../../modules/common/Vec2.ts";
import { IPingMsg, PingMsgSpec } from "../../../modules/common/state/Ping.ts";

export enum MsgType {
  nil,
  ping,
  playerAdded,
  playerMoved,
  playerJump,
  playerRemoved,
  playerSnapshot,
  death,
  negotiatePhysics,
}

export type {
  IDeathMessage,
  INegotiatePhysics,
  IPlayerAdd,
  IPlayerJump,
  IPlayerMove,
  IPlayerRemove,
  IPlayerSnapshot,
};

export {
  DeathMessage,
  NegotiatePhysics,
  PlayerAdd,
  PlayerJump,
  PlayerMove,
  PlayerRemove,
  PlayerSnapshot,
};

interface INilPayload {
  nid: Uuid;
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
  position: Instance;
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
  position: Instance;
  velocity: Instance;
  pose: PoseType;
}

const playerSnapshotStack = stack.fork();
const PlayerSnapshotSpec: IBufferProxyObjectSpec<IPlayerSnapshot> = {
  props: Object.assign({}, NilPayloadSpec.props, {
    position: playerSnapshotStack.box(Vec2LargeSpec),
    velocity: playerSnapshotStack.box(Vec2LargeSpec),
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
  acceleration: Instance;
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

interface IPlayerJump extends INilPayload {
  intensity: number;
}

const playerJumpStack = stack.fork();
const PlayerJumpSpec: IBufferProxyObjectSpec<IPlayerJump> = {
  props: Object.assign(
    {},
    NilPayloadSpec.props,
    {
      intensity: playerJumpStack.box(PrimitiveValue.Uint8),
    },
  ),
};

const PlayerJump = defMessageType<IPlayerJump>(
  MsgType.playerJump,
  PlayerJumpSpec,
);

type IDeathMessage = INilPayload;
const DeathMessage = defMessageType<INilPayload>(
  MsgType.death,
  NilPayloadSpec,
);

interface INegotiatePhysics extends INilPayload {
  position: Instance;
  velocity: Instance;
}

const negotiateStack = stack.fork();
const NegotiatePhysicsSpec: IBufferProxyObjectSpec<INegotiatePhysics> = {
  props: Object
    .assign({}, NilPayloadSpec.props, {
      position: negotiateStack.box(Vec2LargeSpec),
      velocity: negotiateStack.box(Vec2LargeSpec),
    }),
};

const NegotiatePhysics = defMessageType<INegotiatePhysics>(
  MsgType.negotiatePhysics,
  NegotiatePhysicsSpec,
);
