import { MessageStateApi } from "./Message.ts";
import { assertEquals } from "asserts";
import {
  defMessageType,
  IPayloadAny,
  MAX_MESSAGE_BYTE_LENGTH,
} from "../../common/Message.ts";
import { map, toArray } from "../Iterable.ts";
import { PrimitiveValue } from "../BufferValue.ts";
import { Uuid } from "../NetworkApi.ts";

interface ITestPayload {
  sid: number;
  nid: number;
}
const TestMsg = defMessageType<ITestPayload>(0, {
  props: {
    sid: [0, PrimitiveValue.Uint8],
    nid: [1, PrimitiveValue.Uint8],
  },
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

  assertEquals(state.getLastReceivedStepId(2 as Uuid), 2);

  assertMessageNidsForServer(state, 0, 0, []);
  assertMessageNidsForServer(state, 1, 1, [3]);
  assertMessageNidsForServer(state, 2, 2, [0]);
  assertMessageNidsForServer(state, 3, 3, [2]);
  assertMessageNidsForServer(state, 4, 4, [1, 2]);
});
