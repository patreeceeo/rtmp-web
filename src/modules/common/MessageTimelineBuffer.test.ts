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

function insert(mq: MessageTimelineBuffer, index: number, nid: number) {
  const item = [MessageType.nil, new NilPayload(networkId(nid), 0)] as [
    MessageType,
    AnyMessagePayload,
  ];
  mq.insert(index, ...item);
}
function mapPayloadNid(iter: Iterable<[unknown, AnyMessagePayload]>) {
  return map(iter, ([_, payload]) => payload.nid);
}

Deno.test("MessageTimelineBuffer happy path", () => {
  // Each "nil" message requires 5 bytes
  const messageByteLength = 5;
  const maxTimeSteps = 4;
  const bufferByteLength = messageByteLength * maxTimeSteps;
  const mq = new MessageTimelineBuffer(
    new ArrayBuffer(bufferByteLength),
    maxTimeSteps,
    payloadMap,
  );
  assertEquals(toArray(mq.at(0)).length, 0, "should initially be empty");

  insert(mq, 0, 0);
  insert(mq, 0, 1);
  insert(mq, 0, 2);

  // should retreive multiple for given timeIndex
  assertEquals(toArray(mapPayloadNid(mq.at(0))), [0, 1, 2]);
  assertEquals(mq.byteOffset, 3 * messageByteLength);

  // should be idempotent
  assertEquals(toArray(mapPayloadNid(mq.at(0))), [0, 1, 2]);

  insert(mq, 1, 3);
  assertEquals(toArray(mapPayloadNid(mq.at(1))), [3]);
  assertEquals(mq.byteOffset, 4 * messageByteLength);

  // earlier items should still be there
  assertEquals(toArray(mapPayloadNid(mq.at(0))), [0, 1, 2]);

  insert(mq, 1, 4);
  insert(mq, 2, 5);
  // At this point, the reported byteLength is actually longer than the underlying buffer
  // This is because it's a circular buffer
  assertEquals(mq.byteOffset, 6 * messageByteLength);

  assertEquals(toArray(mapPayloadNid(mq.slice(1, 2))), [3, 4, 5]);

  // non-sequential insert still writes to the buffer sequentially
  insert(mq, 12, 6);
  assertEquals(mq.byteOffset, 7 * messageByteLength);

  // non-sequential insert still writes to the buffer sequentially
  insert(mq, 2, 7);
  assertEquals(toArray(mapPayloadNid(mq.at(2))), [5, 7]);

  assertEquals(toArray(mapPayloadNid(mq.slice(12, 12))), [6]);
});

Deno.test("MessageTimelineBuffer overflow by adding too many steps with one message each", () => {
  // Each "nil" message requires 5 bytes
  const messageByteLength = 5;
  const maxTimeSteps = 4;
  const bufferByteLength = messageByteLength * maxTimeSteps;
  const mq = new MessageTimelineBuffer(
    new ArrayBuffer(bufferByteLength),
    maxTimeSteps,
    payloadMap,
  );

  for (
    let timeIndex = 0;
    timeIndex <= maxTimeSteps;
    timeIndex++
  ) {
    insert(mq, timeIndex, timeIndex);
  }
  assert(!mq.has(0));
  assertEquals(toArray(mapPayloadNid(mq.slice(0, maxTimeSteps))), [1, 2, 3, 4]);
});

Deno.test("MessageTimelineBuffer overflow by adding too many messages to one step", () => {
  // Each "nil" message requires 5 bytes
  const messageByteLength = 5;
  const maxTimeSteps = 4;
  const bufferByteLength = messageByteLength * maxTimeSteps;
  const mq = new MessageTimelineBuffer(
    new ArrayBuffer(bufferByteLength),
    maxTimeSteps,
    payloadMap,
  );
  for (let data = 0; data <= maxTimeSteps; data++) {
    insert(mq, 18, data);
  }

  assertEquals(toArray(mapPayloadNid(mq.at(18))), [1, 2, 3, 4]);
});

Deno.test("MessageTimelineBuffer overflow by adding too many messages accross multiple steps", () => {
  // Each "nil" message requires 5 bytes
  const messageByteLength = 5;
  const maxTimeSteps = 4;
  const bufferByteLength = messageByteLength * maxTimeSteps;
  const mq = new MessageTimelineBuffer(
    new ArrayBuffer(bufferByteLength),
    maxTimeSteps,
    payloadMap,
  );
  for (
    let timeIndex = 0;
    timeIndex <= maxTimeSteps / 2;
    timeIndex++
  ) {
    insert(mq, timeIndex, timeIndex);
    insert(mq, timeIndex, timeIndex);
  }
  assert(!mq.has(0));
  assertEquals(toArray(mapPayloadNid(mq.slice(0, maxTimeSteps / 2))), [
    1,
    1,
    2,
    2,
  ]);
});
