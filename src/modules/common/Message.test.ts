import * as Message from "./Message.ts";
import * as asserts from "asserts";
import { Vec2 } from "./Vec2.ts";
import { NetworkId } from "./state/Network.ts";
import { ColorId } from "./state/Player.ts";

Deno.test("parseMessage/serializeMessage", () => {
  const messages = [
    {
      type: Message.MessageType.playerAdded,
      payload: new Message.PlayerAdd(new Vec2(0, 0), true, 6 as NetworkId),
    },
    {
      type: Message.MessageType.playerRemoved,
      payload: 6 as NetworkId,
    },
    {
      type: Message.MessageType.playerMoved,
      payload: new Message.PlayerMove(new Vec2(4, 5), 6 as NetworkId, 0),
    },
    {
      type: Message.MessageType.colorChange,
      payload: new Message.ColorChange(ColorId.BLUE, 6 as NetworkId),
    },
  ];

  for (const message of messages) {
    const serializedMsg = Message.serializeMessage(
      message.type,
      message.payload,
    );
    asserts.assertEquals(message, Message.parseMessage(serializedMsg));
  }
});
