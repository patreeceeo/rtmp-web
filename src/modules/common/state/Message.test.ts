import { MessageStateApi } from "./Message.ts";
import { assertEquals } from "asserts";
import { MessageType, NilPayload } from "../../common/Message.ts";
import { NetworkId, networkId } from "../../common/state/Network.ts";

Deno.test("Message sid", () => {
  const state = new MessageStateApi();
  let sid;

  for (sid = 0; sid < 10; sid++) {
    assertEquals(state.lastStepId, sid);
    state.incrementStepId();
  }
});

Deno.test("Message unsent buffer", () => {
  const state = new MessageStateApi();
  const cmds: Array<number> = [];

  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(0), 0),
  );
  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(1), 0),
  );
  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(2), 0),
  );

  for (const [_, payload] of state.getCommands()) {
    cmds.push(payload.nid);
  }

  assertEquals(cmds, [0, 1, 2]);
  cmds.length = 0;

  for (const [_, payload] of state.getCommands()) {
    cmds.push(payload.nid);
  }

  assertEquals(cmds, [0, 1, 2]);
  cmds.length = 0;

  state.incrementStepId();
  for (const [_, payload] of state.getCommands()) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds.length, 0);

  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(3), 1),
  );
  for (const [_, payload] of state.getCommands()) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [3]);
});

Deno.test("Message get commands sent after sid", () => {
  const state = new MessageStateApi();
  const cmds: Array<number> = [];

  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(0), 0),
  );

  state.incrementStepId();
  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(1), 1),
  );

  state.incrementStepId();
  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(2), 2),
  );
  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(3), 2),
  );

  state.incrementStepId();
  state.addCommand(
    MessageType.nil,
    new NilPayload(networkId(4), 3),
  );
  state.lastSentStepId = state.lastStepId;

  for (const [_, payload] of state.getCommandSlice(1, 3)) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [
    1,
    2,
    3,
    4,
  ]);
  cmds.length = 0;

  for (const [_, payload] of state.getCommandSlice(2, 3)) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [2, 3, 4]);
  cmds.length = 0;

  for (const [_, payload] of state.getCommandSlice(3, 3)) {
    cmds.push(payload.nid);
  }
  assertEquals(cmds, [4]);
  cmds.length = 0;
});
