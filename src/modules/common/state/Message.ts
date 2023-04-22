import {
  copyMessage,
  IMessageDef,
  IPayloadAny,
  MAX_MESSAGE_BYTE_LENGTH,
  readMessage,
} from "../../common/Message.ts";
import { DataViewMovable } from "../DataView.ts";
import { invariant } from "../Error.ts";
import { NetworkId } from "../NetworkApi.ts";
import { SetRing } from "../SetRing.ts";

// TODO make these values dynamic. The slower the network the bigger they need to be.
const MAX_LAG = 23;
const BUFFER_SIZE_BYTES = Math.pow(2, 10); // 32 KB

/**
 * What is this ugly monster? It's covering multiple seperate but intimately related
 * concerns:
 *
 * - Creating Step IDs (sid)
 * - Storing (buffering) messages that the client wants to send to the server (commands)
 * - Retrieving those commands for the client's Network system to actually send them
 * - Remembering the sid of the most recently buffered command
 * - Storing the last snapshot message received from the server
 *
 * Feels like there should be another level of abstractions that encapsulates some aspects of this, making this class simpler and/or this should be broken up into smaller classes.
 * TODO rename to CommandSnapshotState
 */
export class MessageStateApi {
  // TODO maybe there should only be one buffer for all commands, snapshots, etc
  #commandBuffer = new ArrayBuffer(BUFFER_SIZE_BYTES);
  #commandBufferView = new DataViewMovable(this.#commandBuffer, {
    isCircular: true,
  });
  #commandBufferByteOffset = 0;
  #commandsByStepCreated = new SetRing(MAX_LAG, BUFFER_SIZE_BYTES);
  #commandsByStepReceived = new SetRing(MAX_LAG, BUFFER_SIZE_BYTES);
  #sidNow = 0;
  #lastSentStepId = 0;
  #lastReceivedStepIdMap: Array<number> = [];
  #lastHandledStepIdMap: Array<number> = [];

  /** Increment the ID number used to identify executions of the fixed pipeline.
   * Note: even if called every milisecond, it would take ~571,233 years for this
   * number to exceed Number.MAX_SAFE_INTEGER
   * TODO use performance.now()
   */
  incrementStepId() {
    this.#sidNow++;
  }

  get currentStep() {
    return this.#sidNow;
  }

  get lastSentStepId() {
    return this.#lastSentStepId;
  }

  set lastSentStepId(sid: number) {
    this.#lastSentStepId = sid;
  }

  getLastReceivedStepId(nid: NetworkId) {
    return this.#lastReceivedStepIdMap[nid];
  }
  getLastHandledStepId(nid: NetworkId) {
    return this.#lastHandledStepIdMap[nid];
  }
  setLastHandledStepId(nid: NetworkId, sid: number) {
    return this.#lastHandledStepIdMap[nid] = sid;
  }

  addCommand<P extends IPayloadAny>(
    MsgDef: IMessageDef<P>,
    writePayload: (p: P) => void,
    sidReceivedAt = this.#sidNow,
  ) {
    const byteOffset = this.#commandBufferByteOffset;
    const payload = MsgDef.write(
      this.#commandBufferView,
      byteOffset,
      writePayload,
    );
    this.#recordCommandMetadata(MsgDef.byteLength, sidReceivedAt, payload.sid);
    return payload;
  }

  #recordCommandMetadata(
    byteLength: number,
    sidReceivedAt: number,
    sidPayload: number,
  ) {
    const byteOffset = this.#commandBufferByteOffset;
    this.#commandBufferByteOffset += byteLength;
    this.#commandsByStepReceived.add(sidReceivedAt, byteOffset);
    this.#commandsByStepCreated.add(sidPayload, byteOffset);
  }

  copyCommandFrom(
    view: DataViewMovable,
    byteOffset = 0,
    sidReceivedAt = this.#sidNow,
  ) {
    const MsgDef = copyMessage(
      view,
      byteOffset,
      this.#commandBufferView,
      this.#commandBufferByteOffset,
    );
    const [_type, payload] = readMessage(view, byteOffset);
    this.#recordCommandMetadata(MsgDef.byteLength, sidReceivedAt, payload.sid);
  }

  *getCommandDataViewsByStepCreated(
    start = this.#sidNow,
    end = start,
  ) {
    for (
      const byteOffset of this.#commandsByStepCreated.sliceValues(start, end)
    ) {
      yield getDataView(
        this.#commandBuffer,
        byteOffset % BUFFER_SIZE_BYTES,
      );
    }
  }

  *getCommandsByStepCreated(
    start = this.#sidNow,
    end = start,
  ) {
    for (
      const byteOffset of this.#commandsByStepCreated.sliceValues(start, end)
    ) {
      yield readMessage(this.#commandBufferView, byteOffset);
    }
  }

  *getCommandsByStepReceived(
    start = this.#sidNow,
    end = start,
  ) {
    for (
      const byteOffset of this.#commandsByStepReceived.sliceValues(start, end)
    ) {
      yield readMessage(this.#commandBufferView, byteOffset);
    }
  }

  #snapshotBuffer = new ArrayBuffer(BUFFER_SIZE_BYTES);
  #snapshotBufferView = new DataViewMovable(this.#snapshotBuffer, {
    isCircular: true,
  });
  #snapshotBufferByteOffset = 0;
  #snapshotsByStepCreated = new SetRing(
    MAX_LAG,
    BUFFER_SIZE_BYTES,
  );
  #snapshotsByCommandStepCreated = new SetRing(
    MAX_LAG,
    BUFFER_SIZE_BYTES,
  );

  addSnapshot<P extends IPayloadAny>(
    MsgDef: IMessageDef<P>,
    writePayload: (p: P) => void,
    sidCreatedAt = this.#sidNow,
  ) {
    const byteOffset = this.#snapshotBufferByteOffset;
    const payload = MsgDef.write(
      this.#snapshotBufferView,
      byteOffset,
      writePayload,
    );
    this.#recordSnapshotMetadata(
      MsgDef.byteLength,
      sidCreatedAt,
      payload.sid,
      payload.nid,
    );
    return payload;
  }

  #recordSnapshotMetadata(
    byteLength: number,
    sidCreatedAt: number,
    sidPayload: number,
    nid: NetworkId,
  ) {
    const byteOffset = this.#snapshotBufferByteOffset;
    this.#snapshotBufferByteOffset += byteLength;
    this.#snapshotsByStepCreated.add(sidCreatedAt, byteOffset);
    this.#snapshotsByCommandStepCreated.add(sidPayload, byteOffset);
    // TODO maybe this should be a map keyed by NetworkId because each client joins
    // at a different time
    this.#lastReceivedStepIdMap[nid] = sidPayload;
  }

  copySnapshotFrom(
    view: DataViewMovable,
    byteOffset = 0,
    sidCreatedAt = this.#sidNow,
  ) {
    const MsgDef = copyMessage(
      view,
      byteOffset,
      this.#snapshotBufferView,
      this.#snapshotBufferByteOffset,
    );
    const [_type, payload] = readMessage(view, byteOffset);
    this.#recordSnapshotMetadata(
      MsgDef.byteLength,
      sidCreatedAt,
      payload.sid,
      payload.nid,
    );
  }

  *getSnapshotDataViewsByStepCreated(
    start = this.#sidNow,
    end = start,
  ) {
    for (
      const byteOffset of this.#snapshotsByStepCreated.sliceValues(start, end)
    ) {
      yield getDataView(
        this.#snapshotBuffer,
        byteOffset % BUFFER_SIZE_BYTES,
      );
    }
  }

  *getSnapshotsByStepCreated(
    start = this.#sidNow,
    end = start,
  ) {
    for (
      const byteOffset of this.#snapshotsByStepCreated.sliceValues(start, end)
    ) {
      yield readMessage(this.#snapshotBufferView, byteOffset);
    }
  }

  *getSnapshotsByCommandStepCreated(
    start = this.#sidNow,
    end = start,
  ) {
    for (
      const byteOffset of this.#snapshotsByCommandStepCreated.sliceValues(
        start,
        end,
      )
    ) {
      yield readMessage(this.#snapshotBufferView, byteOffset);
    }
  }
}

export const MessageState = new MessageStateApi();

const tempBuffer = new ArrayBuffer(MAX_MESSAGE_BYTE_LENGTH);
export function getDataView(buffer: ArrayBuffer, byteOffset: number): DataView {
  invariant(
    byteOffset < buffer.byteLength,
    "byteOffset exceeds length of buffer",
  );
  const byteLength = MAX_MESSAGE_BYTE_LENGTH;
  if (byteOffset + byteLength <= buffer.byteLength) {
    return new DataView(buffer, byteOffset, byteLength);
  } else {
    const newView = new DataView(tempBuffer);
    const originalView = new DataView(buffer);

    let newIndex = 0;
    for (
      let i = byteOffset;
      i < buffer.byteLength && newIndex < byteLength;
      i++, newIndex++
    ) {
      newView.setUint8(newIndex, originalView.getUint8(i));
    }

    for (let i = 0; newIndex < byteLength; i++, newIndex++) {
      newView.setUint8(newIndex, originalView.getUint8(i));
    }

    return newView;
  }
}
