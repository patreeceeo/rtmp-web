import {
  AnyMessagePayload,
  ColorChangeMutable,
  createPayloadMap,
  MessageType,
  parseMessage,
  PlayerAddMutable,
  PlayerMoveMutable,
  PlayerRemoveMutable,
  PlayerSnapshotMutable,
  serializeMessage,
} from "./Message.ts";
import * as asserts from "asserts";
import { Vec2 } from "./Vec2.ts";
import { NetworkId } from "./state/Network.ts";
import { ColorId, PoseType } from "./state/Player.ts";

const payloadMap = createPayloadMap();

Deno.test("parseMessage/serializeMessage", () => {
  const messages: Array<[MessageType, AnyMessagePayload]> = [
    [
      MessageType.playerAdded,
      new PlayerAddMutable(new Vec2(0, 0), true, 6 as NetworkId, 12),
    ],
    [
      MessageType.playerSnapshot,
      new PlayerSnapshotMutable(
        new Vec2(0, 0),
        PoseType.facingLeft,
        6 as NetworkId,
        12,
      ),
    ],
    [
      MessageType.playerMoved,
      new PlayerMoveMutable(new Vec2(0, 0), 616 as NetworkId, 2),
    ],
    [
      MessageType.playerRemoved,
      new PlayerRemoveMutable(6 as NetworkId, 182),
    ],
    [
      MessageType.colorChange,
      new ColorChangeMutable(ColorId.BLUE, 0 as NetworkId, 451),
    ],
  ];
  for (const [type, payload] of messages) {
    asserts.assertEquals(
      parseMessage(serializeMessage(type, payload), payloadMap),
      [type, payload],
    );
  }
});
