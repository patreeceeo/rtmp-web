import {
  IBufferProxyObjectSpec,
  PrimitiveType,
  Vec2Proxy,
} from "../../../modules/common/BufferValue.ts";
import { defMessageType } from "../../../modules/common/Message.ts";
import { NetworkId } from "../../../modules/common/NetworkApi.ts";
import { Vec2 } from "../../../modules/common/Vec2.ts";
import { ColorId } from "../../../modules/common/state/Player.ts";

export enum MsgType {
  nil,
  playerAdded,
  playerSnapshot,
  playerRemoved,
  playerMoved,
  colorChange,
}

export type {
  IColorChange,
  IPlayerAdd,
  IPlayerMove,
  IPlayerRemove,
  IPlayerSnapshot,
};

export { ColorChange, PlayerAdd, PlayerMove, PlayerRemove, PlayerSnapshot };

interface INilPayload {
  nid: NetworkId;
  sid: number;
}

const NilPayloadSpec: IBufferProxyObjectSpec<INilPayload> = {
  nid: PrimitiveType.NetworkId,
  sid: PrimitiveType.Uint16,
};

defMessageType<INilPayload>(MsgType.nil, NilPayloadSpec);

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
}

const PlayerSnapshotSpec: IBufferProxyObjectSpec<IPlayerSnapshot> = Object
  .assign({}, NilPayloadSpec, {
    position: Vec2Proxy,
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
  delta: Vec2;
}

const PlayerMoveSpec: IBufferProxyObjectSpec<IPlayerMove> = Object.assign(
  {},
  NilPayloadSpec,
  {
    delta: Vec2Proxy,
  },
);

const PlayerMove = defMessageType<IPlayerMove>(
  MsgType.playerMoved,
  PlayerMoveSpec,
);

interface IColorChange extends INilPayload {
  color: ColorId;
}

const ColorChangeSpec: IBufferProxyObjectSpec<IColorChange> = Object.assign(
  {},
  NilPayloadSpec,
  {
    color: PrimitiveType.Uint8,
  },
);

const ColorChange = defMessageType<IColorChange>(
  MsgType.colorChange,
  ColorChangeSpec,
);
