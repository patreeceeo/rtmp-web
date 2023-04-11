import { assert, assertEquals } from "asserts";
import { map, toArray } from "./Iterable.ts";
import {
  AnyMessagePayload,
  createPayloadMap,
  MessageType,
  NilPayload,
} from "./Message.ts";
import { MessagePriorityQueue } from "./MessagePriorityQueue.ts";
import { networkId } from "./state/Network.ts";

const payloadMap = createPayloadMap();

function mapPayloadNid(iter: Iterable<[unknown, AnyMessagePayload]>) {
  return map(iter, ([_, payload]) => payload.nid);
}

Deno.test("MessagePriorityQueue", () => {
  // Make buffer small enough that it will have to wrap back around
  const mq = new MessagePriorityQueue(new ArrayBuffer(16), payloadMap);

  assertEquals(toArray(mq.at(0)).length, 0, "should initially be empty");

  // Lower number => Higher Priority
  mq.insert(0, MessageType.nil, new NilPayload(networkId(0), 0));
  mq.insert(0, MessageType.nil, new NilPayload(networkId(1), 0));
  mq.insert(0, MessageType.nil, new NilPayload(networkId(2), 0));

  // should retreive multiple for given priority
  assertEquals(
    toArray(mapPayloadNid(mq.at(0))),
    [0, 1, 2],
  );

  // should be idempotent
  assertEquals(
    toArray(mapPayloadNid(mq.at(0))),
    [0, 1, 2],
  );

  mq.insert(1, MessageType.nil, new NilPayload(networkId(3), 0));
  assertEquals(
    toArray(mapPayloadNid(mq.at(1))),
    [3],
  );

  mq.insert(1, MessageType.nil, new NilPayload(networkId(4), 0));
  mq.insert(2, MessageType.nil, new NilPayload(networkId(5), 0));

  assertEquals(
    toArray(mapPayloadNid(mq.slice(1, 2))),
    [3, 4, 5],
  );

  // non-sequential insert
  mq.insert(12, MessageType.nil, new NilPayload(networkId(6), 0));

  // HERE
  assertEquals(
    toArray(mapPayloadNid(mq.slice(12, 12))),
    [6],
  );

  // overflow by adding one too many
  for (let p = 0; p <= 3; p++) {
    mq.insert(p, MessageType.nil, new NilPayload(networkId(p), p));
  }

  assert(!mq.has(0));
  assert(mq.has(1));
});
