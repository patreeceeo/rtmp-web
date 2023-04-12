import { MessageStateApi } from "./Message.ts";
import { assertEquals } from "asserts";
import {
  AnyMessagePayload,
  MessageType,
  NilPayload,
} from "../../common/Message.ts";
import { networkId } from "../../common/state/Network.ts";
import { map, toArray } from "../Iterable.ts";

function mapPayloadNid(iter: Iterable<[unknown, AnyMessagePayload]>) {
  return map(map(iter, 1) as Iterable<AnyMessagePayload>, "nid");
}

function addMessages(
  state: MessageStateApi,
  nid: number,
  sidCreatedAt: number,
  sidReceivedAt: number = sidCreatedAt,
) {
  const msg = new NilPayload(networkId(nid), sidCreatedAt);
  state.addCommand(MessageType.nil, msg, sidReceivedAt);
  state.addSnapshot(MessageType.nil, msg, sidReceivedAt);
}

function assertMessageNidsByStepCreated(
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

function assertMessageNidsByStepReceived(
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

  assertMessageNidsByStepCreated(state, 0, 0, [1, 2, 3]);

  assertMessageNidsByStepCreated(state, 0, 0, [1, 2, 3]);

  assertMessageNidsByStepCreated(state, 1, 1, []);

  addMessages(state, 4, 1);
  assertMessageNidsByStepCreated(state, 1, 1, [4]);
});

Deno.test("get commands created between given steps", () => {
  const state = new MessageStateApi();

  addMessages(state, 0, 0);

  addMessages(state, 1, 1);

  addMessages(state, 2, 2);
  addMessages(state, 2, 2);

  addMessages(state, 3, 3);

  assertMessageNidsByStepCreated(state, 1, 3, [1, 2, 2, 3]);

  assertMessageNidsByStepCreated(state, 2, 3, [2, 2, 3]);

  assertMessageNidsByStepCreated(state, 3, 3, [3]);
});

Deno.test("get commands received at different step than when created", () => {
  const state = new MessageStateApi();

  addMessages(state, 0, 0, 2);

  addMessages(state, 1, 1, 4);

  addMessages(state, 2, 2, 3);
  addMessages(state, 2, 2, 4);

  addMessages(state, 3, 3, 1);

  assertMessageNidsByStepReceived(state, 0, 0, []);
  assertMessageNidsByStepReceived(state, 1, 1, [3]);
  assertMessageNidsByStepReceived(state, 2, 2, [0]);
  assertMessageNidsByStepReceived(state, 3, 3, [2]);
  assertMessageNidsByStepReceived(state, 4, 4, [1, 2]);
});
