import { assert, assertEquals } from "asserts";
import { map, toArray } from "./Iterable.ts";
import {
  AnyMessagePayload,
  createPayloadMap,
  MessageType,
  NilPayload,
} from "./Message.ts";
import { MessageTimelineBuffer } from "./MessageTimelineBuffer.ts";
import { networkId } from "./state/Network.ts";

const payloadMap = createPayloadMap();

// Each "nil" message requires 5 bytes
const messageByteLength = 5;
const bufferByteLength = messageByteLength * 4;
const mq = new MessageTimelineBuffer(
  new ArrayBuffer(bufferByteLength),
  payloadMap,
);
const arr: Array<[MessageType, AnyMessagePayload]> = [];

function insert(index: number, nid: number) {
  const item = [MessageType.nil, new NilPayload(networkId(nid), 0)] as [
    MessageType,
    AnyMessagePayload,
  ];
  mq.insert(index, ...item);
  arr.splice(index, 0, item);
}
function mapPayloadNid(iter: Iterable<[unknown, AnyMessagePayload]>) {
  return map(iter, ([_, payload]) => payload.nid);
}

Deno.test("MessageTimelineQueue", () => {
  assertEquals(toArray(mq.at(0)).length, 0, "should initially be empty");

  insert(0, 0);
  insert(0, 1);
  insert(0, 2);

  // should retreive multiple for given timeIndex
  assertEquals(
    toArray(mapPayloadNid(mq.at(0))),
    [0, 1, 2],
  );
  assertEquals(mq.byteOffset, 3 * messageByteLength);

  // should be idempotent
  assertEquals(
    toArray(mapPayloadNid(mq.at(0))),
    [0, 1, 2],
  );

  insert(1, 3);
  assertEquals(
    toArray(mapPayloadNid(mq.at(1))),
    [3],
  );
  assertEquals(mq.byteOffset, 4 * messageByteLength);

  // earlier items should still be there
  assertEquals(
    toArray(mapPayloadNid(mq.at(0))),
    [0, 1, 2],
  );

  insert(1, 4);
  insert(2, 5);
  // At this point, the reported byteLength is actually longer than the underlying buffer
  // This is because it's a circular buffer
  assertEquals(mq.byteOffset, 6 * messageByteLength);

  assertEquals(
    toArray(mapPayloadNid(mq.slice(1, 2))),
    [3, 4, 5],
  );

  // non-sequential insert still writes to the buffer sequentially
  insert(12, 6);
  assertEquals(mq.byteOffset, 7 * messageByteLength);

  assertEquals(
    toArray(mapPayloadNid(mq.slice(12, 12))),
    [6],
  );

  // overflow by adding one too many
  for (let p = 0; p <= bufferByteLength / messageByteLength; p++) {
    insert(p, p);
  }

  assert(!mq.has(0));
  assert(mq.has(1));
  assertEquals(mq.byteOffset, 12 * messageByteLength);
});
