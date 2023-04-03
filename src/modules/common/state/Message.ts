import { DataViewMovable } from "../../common/DataView.ts";
import {
  AnyMessagePayload,
  createPayloadMap,
  MessageType,
  readMessage,
  writeMessage,
} from "../../common/Message.ts";
import { MessagePriorityQueue } from "../MessagePriorityQueue.ts";

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
  #payloadMap = createPayloadMap();
  #commandBuffer = new ArrayBuffer(1024);
  #commands = new MessagePriorityQueue(this.#commandBuffer, this.#payloadMap);
  #sid = 0;
  #lastSentStepId = 0;
  #lastReceivedStepId = 0;

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
      // TODO should sid become parameter to writeMessage?
      throw new Error(
        `Step ID of pushed message does not match current step ID. Offender: ${
          JSON.stringify(payload)
        }, current Step ID: ${this.#sid}`,
      );
    }
    this.#commands.insert(payload.sid, type, payload);
  }

  getUnsentCommands(): Generator<[MessageType, AnyMessagePayload]> {
    return this.#commands.at(this.#sid);
  }

  /**
   * Get commands in buffer added after the given Step ID
   */
  getCommandSlice(
    startSid: number,
    endSid: number,
  ): Generator<[MessageType, AnyMessagePayload]> {
    return this.#commands.slice(startSid, endSid);
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
    return readMessage(this.#snapshotBufferView, this.#payloadMap);
  }
}

export const MessageState = new MessageStateApi(100);
