import {
  copyMessage,
  IMessageDef,
  IPayloadAny,
  readMessage,
} from "../../common/Message.ts";
import { DataViewMovable } from "../DataView.ts";
import { isClient } from "../env.ts";
import { NetworkId } from "../NetworkApi.ts";
import { SetRing } from "../SetRing.ts";

// TODO make these values dynamic. The slower the network the bigger they need to be.
const MAX_LAG = 23;
// 1 Megabyte, enough space for about 16 seconds of commands if commands have a max length of 64 bytes and are added at a rate of one per millisecond,
// for clients, and 8 Megabytes for the server. There's currently no mechanism to prevent proxy objects from having their underlying memory overwritten
// so much care needs to be taken to ensure that the buffer is large enough to prevent that from happening. TODO add a mechanism to prevent that from happening.
const BUFFER_SIZE_BYTES = (2 ** 20) * (isClient ? 1 : 8);

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
  // TODO(server) each client should have their own buffer?
  #commandBuffer = new ArrayBuffer(BUFFER_SIZE_BYTES);
  #commandBufferView = new DataViewMovable(this.#commandBuffer, {
    isCircular: true,
  });
  #commandBufferByteOffset = 0;
  #commandsByStepCreated = new SetRing(MAX_LAG, BUFFER_SIZE_BYTES);
  #commandsByStepReceived = new SetRing(MAX_LAG, BUFFER_SIZE_BYTES);
  #lastSentStepId = 0;
  #lastSentStepIdMap: Array<number> = [];
  #lastReceivedStepIdMap: Array<number> = [];
  #lastHandledStepIdMap: Array<number> = [];

  get currentStep() {
    return Math.floor(performance.now());
  }

  setLastSentStepId(nid: NetworkId, sid: number) {
    this.#lastSentStepId = sid;
    this.#lastSentStepIdMap[nid] = sid;
  }
  getLastSentStepId(nid: NetworkId) {
    return this.#lastSentStepIdMap[nid];
  }
  get lastSentStepId() {
    return this.#lastSentStepId;
  }

  getLastReceivedStepId(nid: NetworkId) {
    return this.#lastReceivedStepIdMap[nid];
  }
  getLastHandledStepId(nid: NetworkId) {
    return this.#lastHandledStepIdMap[nid] || 0;
  }
  setLastHandledStepId(nid: NetworkId, sid: number) {
    return this.#lastHandledStepIdMap[nid] = sid;
  }

  addCommand<P extends IPayloadAny>(
    MsgDef: IMessageDef<P>,
    writePayload: (p: P) => void,
    sidReceivedAt = this.currentStep,
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
    sidReceivedAt = this.currentStep,
  ) {
    const MsgDef = copyMessage(
      view,
      byteOffset,
      this.#commandBufferView,
      this.#commandBufferByteOffset,
    );
    const [_type, payload] = readMessage(view, byteOffset);
    // console.log("received sid", payload.sid);
    this.#recordCommandMetadata(MsgDef.byteLength, sidReceivedAt, payload.sid);
  }

  *getCommandsByStepCreated(
    start = this.currentStep,
    end = start,
  ) {
    for (
      const byteOffset of this.#commandsByStepCreated.sliceValues(start, end)
    ) {
      yield readMessage(this.#commandBufferView, byteOffset);
    }
  }

  *getCommandsByStepReceived(
    start = this.currentStep,
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
    sidCreatedAt = this.currentStep,
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
    sidCreatedAt = this.currentStep,
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

  *getSnapshotsByStepCreated(
    start = this.currentStep,
    end = start,
  ) {
    for (
      const byteOffset of this.#snapshotsByStepCreated.sliceValues(start, end)
    ) {
      const [type, payload] = readMessage(this.#snapshotBufferView, byteOffset);
      // TODO(perf) make a unit test for this instead
      if (payload.meta__byteOffset - 1 !== byteOffset) {
        throw new Error(
          `byteOffset mismatch ${payload.meta__byteOffset} !== ${byteOffset}`,
        );
      }
      yield [type, payload] as [number, IPayloadAny];
    }
  }

  *getSnapshotsByCommandStepCreated(
    start = this.currentStep,
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
