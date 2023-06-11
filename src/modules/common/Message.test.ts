import * as Vec2 from "~/common/Vec2.ts";
import {
  copyMessage,
  defMessageType,
  getMessageDef,
  readMessage,
  reset,
} from "./Message.ts";
import * as asserts from "asserts";
import { PrimitiveValue, Vec2SmallSpec } from "./BufferValue.ts";
import { DataViewMovable } from "./DataView.ts";

Deno.test("Message type", () => {
  interface IMyMessage {
    score: number;
  }
  const Msg0 = defMessageType<IMyMessage>(0, {
    props: {
      score: [0, PrimitiveValue.Uint16],
    },
  });
  const Msg1 = defMessageType<IMyMessage>(1, {
    props: {
      score: [0, PrimitiveValue.Uint16],
    },
  });

  asserts.assertEquals(Msg0.type, 0);
  asserts.assertEquals(Msg1.type, 1);

  asserts.assertEquals(getMessageDef(0), Msg0);
  asserts.assertEquals(getMessageDef(1), Msg1);
  reset();
});

Deno.test("Message read/write", () => {
  interface IMyMessage {
    score: number;
  }
  const type = 2;
  const score = 13;

  const Msg = defMessageType<IMyMessage>(type, {
    props: {
      score: [0, PrimitiveValue.Uint16],
    },
  });

  const bufferLength = Msg.byteLength * 2;
  const byteOffset = Msg.byteLength / 2;

  const buf = new DataViewMovable(new ArrayBuffer(bufferLength));
  Msg.write(buf, byteOffset, (payload) => {
    payload.score = score;
  });

  const [typeRead, payload] = readMessage<IMyMessage>(buf, byteOffset);

  asserts.assertEquals(typeRead, type);
  asserts.assertEquals(payload.score, score);
  reset();
});

Deno.test("Message Vec2 bug", () => {
  interface IMyMessage {
    delta: Vec2.Instance;
    isEvil: boolean;
  }
  const type = 2;

  const Msg = defMessageType<IMyMessage>(type, {
    props: {
      delta: [0, Vec2SmallSpec],
      isEvil: [2, PrimitiveValue.Bool],
    },
  });

  const bufferLength = Msg.byteLength * 2;
  const byteOffset = Msg.byteLength / 2;

  const buf = new DataViewMovable(new ArrayBuffer(bufferLength));
  Msg.write(buf, byteOffset, (payload) => {
    Vec2.set(payload.delta, 11, 22);
    payload.isEvil = true;
  });

  const [typeRead, payload] = readMessage<IMyMessage>(buf, byteOffset);

  asserts.assertEquals(typeRead, type);
  asserts.assertEquals(payload.delta, new Vec2.Instance(11, 22));
  reset();
});

Deno.test("Message write ensures complete payload", () => {
  interface IMyMessage {
    score: number;
  }
  const type = 2;

  const Msg = defMessageType<IMyMessage>(type, {
    props: {
      score: [0, PrimitiveValue.Uint16],
    },
  });

  const bufferLength = Msg.byteLength * 2;
  const byteOffset = Msg.byteLength / 2;

  const buf = new DataViewMovable(new ArrayBuffer(bufferLength));
  asserts.assertThrows(() => Msg.write(buf, byteOffset, (_payload) => {}));
  reset();
});

Deno.test("copyMessage", () => {
  interface IMyMessage {
    score: number;
  }
  const typeExpect = 2;
  const score = 13;

  const Msg = defMessageType<IMyMessage>(typeExpect, {
    props: {
      score: [0, PrimitiveValue.Uint16],
    },
  });

  const bufferLength = Msg.byteLength * 2;
  const byteOffset = Msg.byteLength / 2;

  const bufSrc = new DataViewMovable(new ArrayBuffer(bufferLength));
  const bufDest = new DataViewMovable(new ArrayBuffer(bufferLength));

  Msg.write(bufSrc, byteOffset, (p) => {
    p.score = score;
  });

  const MsgCopied = copyMessage(bufSrc, byteOffset, bufDest, byteOffset);

  const [typeActual, payload] = readMessage(bufDest, byteOffset);

  asserts.assertEquals(typeActual, typeExpect);
  asserts.assertEquals(payload.score, score);
  asserts.assertEquals(MsgCopied, Msg);
  reset();
});
