import {
  IBufferProxyObjectSpec,
  PrimitiveValue,
  Vec2LargeProxy,
  Vec2SmallProxy,
} from "../../../modules/common/BufferValue.ts";
import { defMessageType } from "../../../modules/common/Message.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { Vec2 } from "../../../modules/common/Vec2.ts";
import { PoseType } from "../../../modules/common/state/Player.ts";

export enum MsgType {
  nil,
  ping,
  playerAdded,
  playerSnapshot,
  playerRemoved,
  playerMoved,
}
export type {
  IPingMsg,
  IPlayerAdd,
  IPlayerMove,
  IPlayerRemove,
  IPlayerSnapshot,
};

export { PingMsg, PlayerAdd, PlayerMove, PlayerRemove, PlayerSnapshot };

interface INilPayload {
  nid: NetworkId;
  sid: number;
}

const NilPayloadSpec: IBufferProxyObjectSpec<INilPayload> = {
  nid: [0, PrimitiveValue.NetworkId],
  sid: [2, PrimitiveValue.StepId],
};

defMessageType<INilPayload>(MsgType.nil, NilPayloadSpec);

interface IPingMsg {
  id: number;
}

const PingMsgSpec: IBufferProxyObjectSpec<IPingMsg> = {
  // TODO(perf) This could probably be a uint8, since any ping that hasn't been ponged less than 256 steps ago is probably a lost cause
  id: [0, PrimitiveValue.StepId],
};

const PingMsg = defMessageType<IPingMsg>(MsgType.ping, PingMsgSpec);

interface IPlayerAdd extends INilPayload {
  position: Vec2;
  isLocal: boolean;
}

const PlayerAddSpec = Object.assign({}, NilPayloadSpec, {
  position: [10, Vec2LargeProxy],
  isLocal: [18, PrimitiveValue.Bool],
}) as IBufferProxyObjectSpec<IPlayerAdd>;

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

const PlayerSnapshotSpec = Object.assign({}, NilPayloadSpec, {
  position: [10, Vec2LargeProxy],
  velocity: [18, Vec2SmallProxy],
  pose: [20, PrimitiveValue.Uint8],
}) as IBufferProxyObjectSpec<IPlayerSnapshot>;

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

const PlayerMoveSpec = Object.assign(
  {},
  NilPayloadSpec,
  {
    acceleration: [10, Vec2SmallProxy],
  },
) as IBufferProxyObjectSpec<IPlayerMove>;

const PlayerMove = defMessageType<IPlayerMove>(
  MsgType.playerMoved,
  PlayerMoveSpec,
);
