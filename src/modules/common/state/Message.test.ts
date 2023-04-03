import { MessageStateApi } from "./Message.ts";
import { assertEquals } from "asserts";
import { ColorChange, MessageType } from "../../common/Message.ts";
import { ColorId } from "../../common/state/Player.ts";
import { NetworkId } from "../../common/state/Network.ts";

Deno.test("Message sid", () => {
  const state = new MessageStateApi(5);
  let sid;

  for (sid = 0; sid < state.MAX_LAG * 2; sid++) {
    assertEquals(state.lastStepId, sid);
    state.incrementStepId();
  }
});

Deno.test("Message unsent buffer", () => {
  const state = new MessageStateApi(5);
  const nid = 0 as NetworkId;
  const cmds: Array<ColorId> = [];

  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.BLUE, nid, 0),
  );
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.GREEN, nid, 0),
  );
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.YELLOW, nid, 0),
  );

  for (const [_, payload] of state.getUnsentCommands()) {
    cmds.push((payload as ColorChange).color);
  }

  assertEquals(cmds.length, 3);
  assertEquals(cmds, [ColorId.BLUE, ColorId.GREEN, ColorId.YELLOW]);

  cmds.length = 0;

  for (const [_, payload] of state.getUnsentCommands()) {
    cmds.push((payload as ColorChange).color);
  }

  assertEquals(cmds.length, 3);
  assertEquals(cmds, [ColorId.BLUE, ColorId.GREEN, ColorId.YELLOW]);

  cmds.length = 0;

  state.markAllCommandsAsSent();

  for (const [_, payload] of state.getUnsentCommands()) {
    cmds.push((payload as ColorChange).color);
  }
  assertEquals(cmds.length, 0);

  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.ORANGE, nid, 0),
  );
  for (const [_, payload] of state.getUnsentCommands()) {
    cmds.push((payload as ColorChange).color);
  }
  assertEquals(cmds.length, 1);
  assertEquals(cmds, [ColorId.ORANGE]);
});

Deno.test("Message get commands sent after sid", () => {
  const state = new MessageStateApi(5);
  const nid = 0 as NetworkId;
  const cmds: Array<ColorId> = [];

  state.prepareCommandBatch();
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.BLUE, nid, 0),
  );

  state.incrementStepId();
  state.prepareCommandBatch();
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.GREEN, nid, 1),
  );

  state.incrementStepId();
  state.prepareCommandBatch();
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.YELLOW, nid, 2),
  );
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.ORANGE, nid, 2),
  );

  state.incrementStepId();
  state.prepareCommandBatch();
  state.pushUnsentCommand(
    MessageType.colorChange,
    new ColorChange(ColorId.RED, nid, 3),
  );
  state.markAllCommandsAsSent();
  state.lastSentStepId = state.lastStepId;

  for (const [_, payload] of state.getCommandsSentAfter(0)) {
    cmds.push((payload as ColorChange).color);
  }
  assertEquals(cmds, [
    ColorId.GREEN,
    ColorId.YELLOW,
    ColorId.ORANGE,
    ColorId.RED,
  ]);
  cmds.length = 0;

  for (const [_, payload] of state.getCommandsSentAfter(1)) {
    cmds.push((payload as ColorChange).color);
  }
  assertEquals(cmds, [ColorId.YELLOW, ColorId.ORANGE, ColorId.RED]);
  cmds.length = 0;

  for (const [_, payload] of state.getCommandsSentAfter(2)) {
    cmds.push((payload as ColorChange).color);
  }
  assertEquals(cmds, [ColorId.RED]);
  cmds.length = 0;
});