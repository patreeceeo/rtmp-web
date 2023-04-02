import {
  ColorChangeMutable,
  MessageMutable,
  MessageType,
  parseMessage,
  PlayerAddMutable,
  PlayerMoveMutable,
  PlayerRemoveMutable,
  serializeMessage,
} from "./Message.ts";
import * as asserts from "asserts";
import { Vec2 } from "./Vec2.ts";
import { NetworkId } from "./state/Network.ts";
import { ColorId } from "./state/Player.ts";

Deno.test("parseMessage/serializeMessage", () => {
  const messages = [
    new MessageMutable(
      MessageType.playerAdded,
      new PlayerAddMutable(new Vec2(0, 0), false, 6 as NetworkId, 12),
    ),
    new MessageMutable(
      MessageType.playerMoved,
      new PlayerMoveMutable(new Vec2(0, 0), 616 as NetworkId, 2),
    ),
    new MessageMutable(
      MessageType.playerRemoved,
      new PlayerRemoveMutable(6 as NetworkId, 182),
    ),
    new MessageMutable(
      MessageType.colorChange,
      new ColorChangeMutable(ColorId.BLUE, 0 as NetworkId, 451),
    ),
  ];
  for (const message of messages) {
    asserts.assertEquals(
      parseMessage(serializeMessage(message.type, message.payload)),
      message,
    );
  }
});
