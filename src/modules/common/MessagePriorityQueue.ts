import { DataViewMovable } from "./DataView.ts";
import {
  AnyMessagePayload,
  MessageMutablePlayloadByType,
  MessagePlayloadByType,
  readMessage,
  writeMessage,
} from "./Message.ts";
import { MessageType } from "./Message.ts";

class ItemSet {
  constructor(
    readonly priority: number,
    readonly startOffset: number,
    public endOffset: number,
  ) {}
}

export class MessagePriorityQueue {
  #view: DataViewMovable;
  /** Contains one entry for each set of priority-grouped message, keyed by a modulus of the priority */
  #map: Array<ItemSet>;
  constructor(
    buf: ArrayBufferLike,
    readonly payloadMap: MessageMutablePlayloadByType,
  ) {
    this.#view = new DataViewMovable(buf, { isCircular: true });
    // The minimal message is at least 2 bytes (type + sid)
    this.#map = new Array(this.maxLegth);
  }

  #getPreviousItems(priority: number) {
    const mapKey = priority % this.maxLegth;
    const items = (mapKey === 0)
      ? this.#map[this.maxLegth - 1]
      : this.#map[mapKey - 1];
    return items?.priority === priority ? items : undefined;
  }

  #purgeItems() {
    for (let mapKey = 0; mapKey < this.maxLegth; mapKey++) {
      const items = this.#map[mapKey];
      const sweepOffset = this.#view.byteOffset - this.#view.byteLength;
      // console.log("startOffset", items?.startOffset, "sweepOffset", sweepOffset)
      if (items && items.startOffset < sweepOffset) {
        // console.log("deleting items", JSON.stringify(items))
        delete this.#map[mapKey];
      }
    }
  }

  insert<Type extends MessageType>(
    priority: number,
    type: Type,
    payload: MessagePlayloadByType[Type],
  ) {
    const mapKey = priority % this.maxLegth;
    const startOffset = this.#view.byteOffset;
    writeMessage(this.#view, type, payload);
    const endOffset = this.#view.byteOffset;
    const set = this.#map[mapKey];
    this.#purgeItems();
    if (set && set.priority === priority) {
      // console.log("update endOffset", endOffset)
      set.endOffset = endOffset;
    } else {
      const item = new ItemSet(priority, startOffset, endOffset);
      // console.log("create items", JSON.stringify(item))
      this.#map[mapKey] = item;
      const previous = this.#getPreviousItems(priority);
      if (previous && previous.endOffset !== startOffset) {
        throw new Error(
          "Invariant violated: Items should be in order and continuous",
        );
      }
    }
  }

  has(priority: number) {
    const items = this.#map[priority % this.maxLegth];
    return items?.priority === priority;
  }

  *at(
    priority: number,
  ): Generator<[MessageType, AnyMessagePayload]> {
    const initialByteOffset = this.#view.byteOffset;
    if (this.has(priority)) {
      const items = this.#map[priority % this.maxLegth];
      // console.log("got items", JSON.stringify(items))
      this.#view.jump(items.startOffset);
      while (this.#view.byteOffset < items.endOffset) {
        // console.log("reading at", this.#view.byteOffset)
        yield readMessage(this.#view, this.payloadMap);
      }
      this.#view.jump(initialByteOffset);
    }
  }

  *slice(
    startPriority: number,
    endPriority: number,
  ): Generator<[MessageType, AnyMessagePayload]> {
    let priority = startPriority;
    while (priority <= endPriority) {
      if (this.has(priority)) {
        yield* this.at(priority);
      }
      priority++;
    }
  }

  get maxLegth() {
    return this.#view.byteLength / 2;
  }
}
