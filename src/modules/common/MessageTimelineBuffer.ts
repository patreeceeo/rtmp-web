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

// Idea: Use ECS or seperate typed arrays to store each type of value in messages instead of writing the entirety of each message to a single buffer. It might help use memory more efficiently by addressing fragmentation and may help with performance in general by reducing copying, but might be more complicated??

export class MessageTimelineBuffer {
  #view: DataViewMovable;
  #buckets: Array<Bucket>;
  #byteOffsetMin = 0;
  #statsEnabled = false;
  constructor(
    buf: ArrayBufferLike,
    readonly maxTimeSteps: number,
    readonly payloadMap: MessageMutablePlayloadByType,
  ) {
    this.#view = new DataViewMovable(buf, { isCircular: true });
    /** map timeIndex to positions in the buffer */
    this.#buckets = Array.from(new Array(maxTimeSteps), () => new Bucket(0));
  }

  enableStats() {
    this.#statsEnabled = true;
  }

  disableStats() {
    this.#statsEnabled = false;
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
        (offset) => startOffset - offset >= this.bufferByteLength,
      );
      for (const offset of offsetsLeftBehind) {
        bucket.bufferOffsets.delete(offset);
      }
    }
    bucket.bufferOffsets.add(startOffset);

    if (this.#statsEnabled) {
      let min = Infinity;
      for (const bucket of this.#buckets) {
        for (const offset of bucket.bufferOffsets.values()) {
          min = Math.min(min, offset);
        }
      }
      this.#byteOffsetMin = min;
    }
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

  get bufferByteLength() {
    return this.#view.byteLength;
  }

  get bufferByteOffset() {
    this.#view.bytesRemaining;
    return this.#view.byteOffset;
  }

  get bytesCapacity() {
    return this.#view.byteLength;
  }

  get bytesConsumed() {
    return this.#view.byteOffset - this.#byteOffsetMin;
  }

  get __buckets__() {
    return this.#buckets;
  }
}
