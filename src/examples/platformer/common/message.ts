import {
  IBufferProxyObjectSpec,
  PrimitiveType,
  Vec2Proxy,
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
  nid: PrimitiveType.NetworkId,
  sid: PrimitiveType.StepId,
};

defMessageType<INilPayload>(MsgType.nil, NilPayloadSpec);

interface IPingMsg {
  id: number;
}

const PingMsgSpec: IBufferProxyObjectSpec<IPingMsg> = {
  // TODO(perf) This could probably be a uint8, since any ping that hasn't been ponged less than 256 steps ago is probably a lost cause
  id: PrimitiveType.StepId,
};

const PingMsg = defMessageType<IPingMsg>(MsgType.ping, PingMsgSpec);

interface IPlayerAdd extends INilPayload {
  position: Vec2;
  isLocal: boolean;
}

const PlayerAddSpec: IBufferProxyObjectSpec<IPlayerAdd> = Object.assign(
  {},
  NilPayloadSpec,
  {
    position: Vec2Proxy,
    isLocal: PrimitiveType.Bool,
  },
);

const PlayerAdd = defMessageType<IPlayerAdd>(
  MsgType.playerAdded,
  PlayerAddSpec,
);

interface IPlayerSnapshot extends INilPayload {
  position: Vec2;
  velocity: Vec2;
  pose: PoseType;
}

const PlayerSnapshotSpec: IBufferProxyObjectSpec<IPlayerSnapshot> = Object
  .assign({}, NilPayloadSpec, {
    position: Vec2Proxy,
    velocity: Vec2Proxy,
    pose: PrimitiveType.Uint8,
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

const PlayerMoveSpec: IBufferProxyObjectSpec<IPlayerMove> = Object.assign(
  {},
  NilPayloadSpec,
  {
    acceleration: Vec2Proxy,
  },
);

const PlayerMove = defMessageType<IPlayerMove>(
  MsgType.playerMoved,
  PlayerMoveSpec,
);
