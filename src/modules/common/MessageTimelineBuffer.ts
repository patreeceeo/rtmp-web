import { DataViewMovable } from "./DataView.ts";
import { filter } from "./Iterable.ts";
import {
  AnyMessagePayload,
  MessageMutablePlayloadByType,
  MessagePlayloadByType,
  readMessage,
  writeMessage,
} from "./Message.ts";
import { MessageType } from "./Message.ts";

class Bucket {
  public bufferOffsets = new Set<number>();
  constructor(public timeIndex: number) {}
}

export class MessageTimelineBuffer {
  #view: DataViewMovable;
  #buckets: Array<Bucket>;
  constructor(
    buf: ArrayBufferLike,
    readonly maxTimeSteps: number,
    readonly payloadMap: MessageMutablePlayloadByType,
  ) {
    this.#view = new DataViewMovable(buf, { isCircular: true });
    /** map timeIndex to positions in the buffer */
    this.#buckets = Array.from(new Array(maxTimeSteps), () => new Bucket(0));
  }

  insert<Type extends MessageType>(
    timeIndex: number,
    type: Type,
    payload: MessagePlayloadByType[Type],
  ) {
    const mapKey = timeIndex % this.maxTimeSteps;
    const startOffset = this.#view.byteOffset;
    writeMessage(this.#view, type, payload);
    const bucket = this.#buckets[mapKey];
    if (bucket.timeIndex !== timeIndex) {
      bucket.timeIndex = timeIndex;
      bucket.bufferOffsets.clear();
    }
    for (const bucket of this.#buckets) {
      const offsetsLeftBehind = filter(
        bucket.bufferOffsets.values(),
        (offset) => startOffset - offset >= this.byteLength,
      );
      for (const offset of offsetsLeftBehind) {
        bucket.bufferOffsets.delete(offset);
      }
    }
    bucket.bufferOffsets.add(startOffset);
  }

  has(timeIndex: number) {
    const bucket = this.#buckets[timeIndex % this.maxTimeSteps];
    return bucket?.timeIndex === timeIndex && bucket.bufferOffsets.size > 0;
  }

  *at(timeIndex: number): Generator<[MessageType, AnyMessagePayload]> {
    const initialByteOffset = this.#view.byteOffset;
    if (this.has(timeIndex)) {
      const bucket = this.#buckets[timeIndex % this.maxTimeSteps];
      // console.log("got items", JSON.stringify(items))

      for (const offset of bucket.bufferOffsets.values()) {
        this.#view.jump(offset);
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

  get __buckets__() {
    return this.#buckets;
  }
}
