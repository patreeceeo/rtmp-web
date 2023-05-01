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
  #idMap: Map<number, Ping> = new Map();
  /** in milliseconds */
  averageRoundTripTime = NaN;
  getAll() {
    return this.#idMap.values();
  }

  get(id: number) {
    return this.#idMap.get(id);
  }

  add(ping: Ping) {
    this.#idMap.set(ping.id, ping);
  }

  delete(id: number) {
    this.#idMap.delete(id);
  }
}

export const PingState = new PingStateApi();
