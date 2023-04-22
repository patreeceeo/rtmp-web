import { getDataView, MessageStateApi } from "./Message.ts";
import { assertEquals } from "asserts";
import {
  defMessageType,
  IPayloadAny,
  MAX_MESSAGE_BYTE_LENGTH,
} from "../../common/Message.ts";
import { map, toArray } from "../Iterable.ts";
import { PrimitiveType } from "../BufferValue.ts";
import { NetworkId } from "../NetworkApi.ts";

interface ITestPayload {
  sid: number;
  nid: number;
}
const TestMsg = defMessageType<ITestPayload>(0, {
  sid: PrimitiveType.Uint8,
  nid: PrimitiveType.Uint8,
});

function mapPayloadNid(iter: Iterable<[unknown, IPayloadAny]>) {
  return map(map(iter, 1) as Iterable<ITestPayload>, "nid");
}

function addMessages(
  state: MessageStateApi,
  nid: number,
  sidCreatedAt: number,
  sidReceivedAt: number = sidCreatedAt,
) {
  const fillPayload = (pl: ITestPayload) => {
    pl.sid = sidCreatedAt;
    pl.nid = nid;
  };
  state.addCommand(TestMsg, fillPayload, sidReceivedAt);
  state.addSnapshot(TestMsg, fillPayload, sidReceivedAt);
}

function assertMessageNidsForClient(
  state: MessageStateApi,
  start: number,
  end: number,
  nids: Array<number>,
) {
  assertEquals(
    toArray(mapPayloadNid(state.getCommandsByStepCreated(start, end))),
    nids,
  );
  assertEquals(
    toArray(mapPayloadNid(state.getSnapshotsByCommandStepCreated(start, end))),
    nids,
  );
}

function assertMessageNidsForServer(
  state: MessageStateApi,
  start: number,
  end: number,
  nids: Array<number>,
) {
  assertEquals(
    toArray(mapPayloadNid(state.getCommandsByStepReceived(start, end))),
    nids,
  );
  assertEquals(
    toArray(mapPayloadNid(state.getSnapshotsByStepCreated(start, end))),
    nids,
  );
}

Deno.test("Message sid", () => {
  const state = new MessageStateApi();
  let sid;

  for (sid = 0; sid < 10; sid++) {
    assertEquals(state.currentStep, sid);
    state.incrementStepId();
  }
});

Deno.test("get messages created in most recent step", () => {
  const state = new MessageStateApi();

  addMessages(state, 1, 0);
  addMessages(state, 2, 0);
  addMessages(state, 3, 0);

  assertMessageNidsForClient(state, 0, 0, [1, 2, 3]);

  assertMessageNidsForClient(state, 0, 0, [1, 2, 3]);

  assertMessageNidsForClient(state, 1, 1, []);

  addMessages(state, 4, 1);
  assertMessageNidsForClient(state, 1, 1, [4]);
});

Deno.test("get commands created between given steps", () => {
  const state = new MessageStateApi();

  addMessages(state, 0, 0);

  addMessages(state, 1, 1);

  addMessages(state, 2, 2);
  addMessages(state, 2, 2);

  addMessages(state, 3, 3);

  assertMessageNidsForClient(state, 1, 3, [1, 2, 2, 3]);

  assertMessageNidsForClient(state, 2, 3, [2, 2, 3]);

  assertMessageNidsForClient(state, 3, 3, [3]);
});

Deno.test("get commands received at different step than when created", () => {
  const state = new MessageStateApi();

  addMessages(state, 0, 0, 2);

  addMessages(state, 1, 1, 4);

  addMessages(state, 2, 2, 3);

  addMessages(state, 3, 3, 1);

  addMessages(state, 2, 2, 4);

  assertEquals(state.getLastReceivedStepId(2 as NetworkId), 2);

  assertMessageNidsForServer(state, 0, 0, []);
  assertMessageNidsForServer(state, 1, 1, [3]);
  assertMessageNidsForServer(state, 2, 2, [0]);
  assertMessageNidsForServer(state, 3, 3, [2]);
  assertMessageNidsForServer(state, 4, 4, [1, 2]);
});

Deno.test("getDataView can wrap around to beginning of buffer", () => {
  const buffer = new ArrayBuffer(MAX_MESSAGE_BYTE_LENGTH);
  const view = new DataView(buffer);

  // Initialize buffer with values 1 through 16
  for (let i = 0; i < MAX_MESSAGE_BYTE_LENGTH; i++) {
    view.setUint8(i, i);
  }

  for (let start = 0; start < MAX_MESSAGE_BYTE_LENGTH; start++) {
    const result = getDataView(buffer, start);
    // values should be shifted to the left by `start`
    for (let i = 0; i < result.byteLength - start; i++) {
      assertEquals(result.getUint8(i), i + start);
    }
    // `start` values from beginning should be at the end
    for (let i = 0; i < start; i++) {
      assertEquals(result.getUint8(result.byteLength - start + i), i);
    }
  }
});
