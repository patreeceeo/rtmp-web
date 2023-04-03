import { DataViewMovable } from "../../common/DataView.ts";
import {
  AnyMessagePayload,
  createPayloadMap,
  IAnyMessage,
  IAnyMessageMutable,
  MessageMutable,
  MessageType,
  NilPayloadMutable,
  PlayerMove,
  PlayerMoveMutable,
  readMessage,
  writeMessage,
} from "../../common/Message.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { Vec2 } from "../../common/Vec2.ts";

const payloadMap = createPayloadMap();
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
 */
export class MessageStateApi {
  #commandBuffer = new ArrayBuffer(1024);
  /** commands that have not yet been sent to the server */
  #unsentBufferView = new DataViewMovable(this.#commandBuffer, {
    isCircular: true,
  });
  #unsentCommandCount = 0;
  /** commands awaiting server acknowlogement */
  #lastUnsentCommandBufferView = new DataViewMovable(this.#commandBuffer, {
    isCircular: true,
  });
  /** commands that have server acknowlogement */
  #serverBufferView = new DataViewMovable(this.#commandBuffer, {
    isCircular: true,
  });
  #sid = 0;
  #lastSentStepId = 0;
  #lastReceivedStepId = 0;
  #recycledMessage = new MessageMutable(
    MessageType.nil,
    new NilPayloadMutable(0 as NetworkId, 0),
  ) as IAnyMessageMutable;
  #reusedPlayerMove = new PlayerMoveMutable(new Vec2(), 0 as NetworkId, 0);
  #commandSidToBufferMap: Array<number> = [];

  #snapshotBuffer = new ArrayBuffer(256);
  #snapshotBufferView = new DataViewMovable(this.#snapshotBuffer, {
    isCircular: true,
  });

  constructor(readonly MAX_LAG: number) {}

  /** Increment the ID number used to identify executions of the fixed pipeline.
   * Note: even if called every milisecond, it would take ~571,233 years for this
   * number to exceed Number.MAX_SAFE_INTEGER
   */
  incrementStepId() {
    this.#sid++;
  }

  prepareCommandBatch() {
    const sidModulus = this.#sid % this.MAX_LAG;
    const bufferOffset = this.#lastUnsentCommandBufferView.byteOffset;
    this.#commandSidToBufferMap[sidModulus] = bufferOffset;
  }

  get lastStepId() {
    return this.#sid;
  }

  get lastSentStepId() {
    return this.#lastSentStepId;
  }

  set lastSentStepId(sid: number) {
    this.#lastSentStepId = sid;
  }

  get lastReceivedStepId() {
    return this.#lastReceivedStepId;
  }

  pushUnsentCommand(type: MessageType, payload: AnyMessagePayload) {
    if (payload.sid !== this.#sid) {
      throw new Error(
        `Step ID of pushed message does not match current step ID. Offender: ${
          JSON.stringify(payload)
        }, current Step ID: ${this.#sid}`,
      );
    }
    writeMessage(this.#lastUnsentCommandBufferView, type, payload);
    this.#unsentCommandCount++;
  }

  *getUnsentCommands(): Generator<[MessageType, AnyMessagePayload]> {
    let count = this.#unsentCommandCount;
    const originalOffset = this.#unsentBufferView.byteOffset;
    while (count > 0) {
      yield readMessage(this.#unsentBufferView, payloadMap);
      count--;
    }
    this.#unsentBufferView.jump(originalOffset);
  }

  markAllCommandsAsSent() {
    this.#unsentCommandCount = 0;
    this.#unsentBufferView.jump(this.#lastUnsentCommandBufferView.byteOffset);
  }

  /**
   * Get commands in buffer added after the given Step ID
   */
  *getCommandsSentAfter(
    sid: number,
  ): Generator<[MessageType, AnyMessagePayload]> {
    // Prevent infinite loop
    // TODO what causes the infinite loop?
    let count = 0;
    const sidModulus = (sid + 1) % this.MAX_LAG;
    if (sidModulus in this.#commandSidToBufferMap) {
      const newByteOffset = this.#commandSidToBufferMap[sidModulus];
      this.#serverBufferView.jump(newByteOffset);
      while (true) {
        const [type, payload] = readMessage(this.#serverBufferView, payloadMap);
        yield [type, payload];
        count++;
        if (
          payload.sid >= this.#lastSentStepId || count > this.MAX_LAG
        ) {
          break;
        }
      }
    }
  }

  // TODO use a different type for server response because it's not a delta when
  // coming from the server, it's an absolute position. Also, might have multiple
  // types of messages for player moves being sent to the server (like duck, jump,
  // etc), but the server only needs 1 type of message.
  pushSnapshot(type: MessageType, payload: AnyMessagePayload) {
    this.#snapshotBufferView.jump(0);
    writeMessage(this.#snapshotBufferView, type, payload);
    this.#lastReceivedStepId = payload.sid;
  }

  get lastSnapshot(): [MessageType, AnyMessagePayload] {
    this.#snapshotBufferView.jump(0);
    return readMessage(this.#snapshotBufferView, payloadMap);
  }
}

export const MessageState = new MessageStateApi(100);
