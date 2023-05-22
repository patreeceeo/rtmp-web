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

  get sentTimeMS() {
    return this.#sentTime;
  }

  get roundTripTime() {
    return this.#recvTime - this.#sentTime;
  }

  setSent() {
    this.#state = PingStatus.SENT;
    this.#sentTime = performance.now();
  }

  setReceived() {
    this.#state = PingStatus.RECEIVED;
    this.#recvTime = performance.now();
  }
}

class PingStateApi {
  #nextId = 0;
  #lastId = -1;
  #idMap: Map<number, Ping> = new Map();
  /** in milliseconds */
  pingTime = 10;
  dropCount = 0;
  msgType?: number;
  getAll() {
    return this.#idMap.values();
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

export function updatePingData(mostRecentlyReceivedPingId: number) {
  const mostRecentlyReceivedPing = PingState.get(mostRecentlyReceivedPingId);
  if (!mostRecentlyReceivedPing) {
    console.error(
      "Received ping with id",
      mostRecentlyReceivedPingId,
      "but no such ping exists",
    );
  }
  if (mostRecentlyReceivedPingId !== PingState.lastId) {
    console.warn(
      "Received ping with id",
      mostRecentlyReceivedPingId,
      "but expected",
      PingState.nextId - 1,
    );
  }
  mostRecentlyReceivedPing!.setReceived();
  PingState.pingTime = weightedAverage(
    PingState.pingTime,
    mostRecentlyReceivedPing!.roundTripTime,
  );
}

export function weightedAverage(...values: number[]) {
  let sum = 0;
  let divisor = 0;
  for (let i = 0, weight = i + 2; i < values.length; i++, weight += 3) {
    sum += values[i] * weight;
    divisor += weight;
  }
  return sum / divisor;
}

export function cleanup(timeout: number) {
  // clear old pings
  const oldPings = filter(
    PingState.getAll(),
    (pong) => performance.now() - pong.sentTimeMS > timeout,
  );
  for (const pong of oldPings) {
    if (pong.state === PingStatus.SENT) {
      PingState.dropCount++;
    }
    PingState.delete(pong.id);
  }
}
