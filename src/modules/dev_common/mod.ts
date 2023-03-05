import { SerializedData } from "../common/socket.ts";

export interface Message<Payload> {
  payload: Payload;
  type: MessageType;
  serializeWithEnvelope(): SerializedData;
}

interface MessageEnvelope<Payload> {
  messageType: MessageType;
  payload: Payload;
}
export interface HotSwapPayload {
  paths: Array<string>;
}
export class HotSwapMessage implements Message<HotSwapPayload> {
  static fromIterable(paths: IterableIterator<string>) {
    const payload: HotSwapPayload = { paths: [] };
    for (const path of paths) {
      payload.paths.push(path);
    }
    return new HotSwapMessage(payload);
  }
  _payload: HotSwapPayload = {
    paths: [],
  };
  constructor(payload: HotSwapPayload) {
    this.payload = payload;
  }
  type = MessageType.hotSwap;
  serializeWithEnvelope() {
    return JSON.stringify(createMessageEnvelope(this.type, this.payload));
  }
  set payload(payload: this["_payload"]) {
    this._payload = payload;
  }
  get payload() {
    return this._payload;
  }
}

function createMessageEnvelope<Payload>(
  type: MessageType,
  payload: Payload,
): MessageEnvelope<Payload> {
  return { messageType: type, payload };
}

const messageClassByType = [HotSwapMessage];
export enum MessageType {
  hotSwap,
}

export function parseMessage(serializedData: string): HotSwapMessage {
  const parsed = JSON.parse(serializedData) as MessageEnvelope<HotSwapPayload>;
  const MessageClass = messageClassByType[parsed.messageType];
  return new MessageClass(parsed.payload);
}
