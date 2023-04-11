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
    readonly timeIndex: number,
    readonly startBufferOffset: number,
    public endBufferOffset: number,
  ) {}
}

export class MessageTimelineBuffer {
  #view: DataViewMovable;
  /** Contains one entry for each set of timeIndex-grouped message, keyed by a modulus of the timeIndex */
  #map: Array<ItemSet>;
  constructor(
    buf: ArrayBufferLike,
    readonly payloadMap: MessageMutablePlayloadByType,
  ) {
    this.#view = new DataViewMovable(buf, { isCircular: true });
    /** map time index to positions in the buffer */
    this.#map = new Array(this.byteLength);
  }

  #getPreviousItems(timeIndex: number) {
    const mapKey = timeIndex % this.byteLength;
    const items = (mapKey === 0)
      ? this.#map[this.byteLength - 1]
      : this.#map[mapKey - 1];
    return items?.timeIndex === timeIndex ? items : undefined;
  }

  #purgeItems() {
    for (let mapKey = 0; mapKey < this.byteLength; mapKey++) {
      const items = this.#map[mapKey];
      const sweepOffset = this.#view.byteOffset - this.#view.byteLength;
      // console.log("startOffset", items?.startOffset, "sweepOffset", sweepOffset)
      if (items && items.startBufferOffset < sweepOffset) {
        // console.log("deleting items", JSON.stringify(items))
        delete this.#map[mapKey];
      }
    }
  }

  insert<Type extends MessageType>(
    timeIndex: number,
    type: Type,
    payload: MessagePlayloadByType[Type],
  ) {
    const mapKey = timeIndex % this.byteLength;
    const startOffset = this.#view.byteOffset;
    console.log({startOffset})
    writeMessage(this.#view, type, payload);
    const endOffset = this.#view.byteOffset;
    const set = this.#map[mapKey];
    this.#purgeItems();
    if (set && set.timeIndex === timeIndex) {
      // console.log("update endOffset", endOffset)
      set.endBufferOffset = endOffset;
    } else {
      const item = new ItemSet(timeIndex, startOffset, endOffset);
      // console.log("create items", JSON.stringify(item))
      this.#map[mapKey] = item;
      const previous = this.#getPreviousItems(timeIndex);
      if (previous && previous.endBufferOffset !== startOffset) {
        throw new Error(
          "Invariant violated: Items should be in order and continuous",
        );
      }
    }
  }

  has(timeIndex: number) {
    const items = this.#map[timeIndex % this.byteLength];
    return items?.timeIndex === timeIndex;
  }

  *at(
    timeIndex: number,
  ): Generator<[MessageType, AnyMessagePayload]> {
    const initialByteOffset = this.#view.byteOffset;
    if (this.has(timeIndex)) {
      const items = this.#map[timeIndex % this.byteLength];
      // console.log("got items", JSON.stringify(items))
      this.#view.jump(items.startBufferOffset);
      while (this.#view.byteOffset < items.endBufferOffset) {
        // console.log("reading at", this.#view.byteOffset)
        yield readMessage(this.#view, this.payloadMap);
      }
      this.#view.jump(initialByteOffset);
    }
  }

  *slice(
    startTimeIndex: number,
    endTimeIndex: number,
  ): Generator<[MessageType, AnyMessagePayload]> {
    let timeIndex = startTimeIndex;
    while (timeIndex <= endTimeIndex) {
      if (this.has(timeIndex)) {
        yield* this.at(timeIndex);
      }
      timeIndex++;
    }
  }

  get byteLength() {
    return this.#view.byteLength;
  }

  get byteOffset() {
    return this.#view.byteOffset;
  }
}
