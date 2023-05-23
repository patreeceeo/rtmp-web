import { IBufferProxyObjectSpec, PrimitiveValue } from "../BufferValue.ts";
import { DataViewMovable } from "../DataView.ts";
import { filter } from "../Iterable.ts";
import { sendIfOpen } from "../socket.ts";

export interface IPingMsg {
  id: number;
}
export const PingMsgSpec: IBufferProxyObjectSpec<IPingMsg> = {
  id: [0, PrimitiveValue.Uint8],
};

enum PingStatus {
  CREATED,
  SENT,
  RECEIVED,
}
export class Ping {
  static Status = PingStatus;

  #sentTime = NaN;
  #recvTime = NaN;
  #state = PingStatus.CREATED;
  constructor(readonly id: number) {}

  get state() {
    return this.#state;
  }

  get sentTime() {
    return this.#sentTime;
  }

  get recvTime() {
    return this.#recvTime;
  }

  get roundTripTime() {
    return this.#recvTime - this.#sentTime;
  }

  setSent(time: number) {
    this.#state = PingStatus.SENT;
    this.#sentTime = time;
  }

  setReceived(time: number) {
    this.#state = PingStatus.RECEIVED;
    this.#recvTime = time;
  }
}

class PingStateApi {
  #nextId = 0;
  #lastId = -1;
  #idMap: Map<number, Ping> = new Map();
  dropCount = 0;
  msgType?: number;
  getAll() {
    return this.#idMap.values();
  }
  
  getReceived(windowStart: number, windowEnd: number) {
    return filter(this.#idMap.values(), (ping) => {
      return ping.state === Ping.Status.RECEIVED &&
        ping.recvTime >= windowStart && ping.recvTime <= windowEnd;
    });
  }

  get(id: number) {
    return this.#idMap.get(id);
  }

  get nextId() {
    return this.#nextId;
  }

  get lastId() {
    return this.#lastId;
  }

  add(ping: Ping) {
    this.#idMap.set(ping.id, ping);
    this.#lastId = this.#nextId;
    this.#nextId = Math.max(this.#nextId, ping.id + 1) % 256;
  }

  delete(id: number) {
    this.#idMap.delete(id);
  }
}

export const PingState = new PingStateApi();

export function initPing(msgType: number) {
  PingState.msgType = msgType;
}

const pingDataView = new DataViewMovable(new ArrayBuffer(2));

export function sendPing(id: number, socket: WebSocket) {
  if (PingState.msgType !== undefined) {
    pingDataView.setUint8(0, PingState.msgType);
    pingDataView.setUint8(1, id);
    sendIfOpen(socket, pingDataView);
  } else {
    throw new Error("PingState is not initialized");
  }
}

export function updatePing(id: number, recvTime: number) {
  const mostRecentlyReceivedPing = PingState.get(id);
  if (!mostRecentlyReceivedPing) {
    console.error(
      `No such ping: ${id}`,
    );
  }
  if (id !== PingState.lastId) {
    console.warn(
      "Received ping with id",
      id,
      "but expected",
      PingState.nextId - 1,
    );
  }
  mostRecentlyReceivedPing!.setReceived(recvTime);
}

export function cleanup(windowEnd: number) {
  // clear old pings
  const oldPings = filter(
    PingState.getAll(),
    (pong) => pong.sentTime < windowEnd,
  );
  for (const pong of oldPings) {
    if (pong.state === PingStatus.SENT) {
      PingState.dropCount++;
    }
    PingState.delete(pong.id);
  }
}
