import * as Message from './Message.ts'
import * as asserts from 'asserts'
import { Player } from './State.ts'
import { Vec2 } from "./Vec2.ts"

Deno.test("parseMessage/serializeMessage", () => {
  const messages = [
    {
      type: Message.MessageType.playerAdded,
      payload: {isLocal: true, player: new Player(6, new Vec2(0, 0))}
    },
    {
      type: Message.MessageType.playerRemoved,
      payload: 6
    },
    {
      type: Message.MessageType.playerMoved,
      payload: new Message.PlayerMove(new Vec2(4, 5), 6)
    },
  ]


  for(const message of messages) {
    const serializedMsg =
      Message.serializeMessage(
        message.type,
        message.payload
    )
    asserts.assertEquals(message, Message.parseMessage(serializedMsg))
  }
})
