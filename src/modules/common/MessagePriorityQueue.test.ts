import { assert, assertEquals } from "asserts";
import { createPayloadMap, MessageType, NilPayload } from "./Message.ts";
import { MessagePriorityQueue } from "./MessagePriorityQueue.ts";
import { networkId } from "./state/Network.ts";

const payloadMap = createPayloadMap();

Deno.test("MessagePriorityQueue", () => {
  // Make buffer small enough that it will have to wrap back around
  const mq = new MessagePriorityQueue(new ArrayBuffer(16), payloadMap);
  const cmds: Array<number> = [];

  for (const [_, payload] of mq.at(0)) {
    cmds.push(payload.nid);
  }

  assertEquals(cmds.length, 0, "should initially be empty");
  cmds.length = 0;

  // Lower number => Higher Priority
  mq.insert(
    0,
    MessageType.nil,
    new NilPayload(networkId(0), 0),
  );
  mq.insert(
    0,
    MessageType.nil,
    new NilPayload(networkId(1), 0),
  );
  mq.insert(
    0,
    MessageType.nil,
    new NilPayload(networkId(2), 0),
  );

  for (const [_, payload] of mq.at(0)) {
    cmds.push(payload.nid);
  }

  // should retreive multiple for given priority
  assertEquals(cmds, [0, 1, 2]);
  cmds.length = 0;

  for (const [_, payload] of mq.at(0)) {
    cmds.push(payload.nid);
  }

  // should be idempotent
  assertEquals(cmds, [0, 1, 2]);
  cmds.length = 0;

  mq.insert(
    1,
    MessageType.nil,
    new NilPayload(networkId(3), 0),
  );
  for (const [_, payload] of mq.at(1)) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [3]);
  cmds.length = 0;

  mq.insert(
    1,
    MessageType.nil,
    new NilPayload(networkId(4), 0),
  );

  mq.insert(
    2,
    MessageType.nil,
    new NilPayload(networkId(5), 0),
  );

  for (const [_, payload] of mq.slice(1, 2)) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [3, 4, 5]);
  cmds.length = 0;

  // non-sequential insert
  mq.insert(
    12,
    MessageType.nil,
    new NilPayload(networkId(6), 0),
  );

  for (const [_, payload] of mq.slice(12, 12)) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [6]);
  cmds.length = 0;

  // overflow by adding one too many
  for (let p = 0; p <= 3; p++) {
    mq.insert(p, MessageType.nil, new NilPayload(networkId(p), p));
  }

  assert(!mq.has(0));
  assert(mq.has(1));
});
