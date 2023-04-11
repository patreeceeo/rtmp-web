import {
  AnyMessagePayload,
  createPayloadMap,
  MessagePlayloadByType,
  MessageType,
} from "../../common/Message.ts";
import { MessageTimelineBuffer } from "../MessageTimelineBuffer.ts";
import { isClient } from "~/common/env.ts";

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
  #commands = new MessageTimelineBuffer(this.#commandBuffer, this.#payloadMap);
  #sid = 0;
  #lastSentStepId = 0;

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

  addCommand(type: MessageType, payload: AnyMessagePayload) {
    if (payload.sid !== this.#sid && isClient) {
      // TODO should sid become parameter to writeMessage?
      throw new Error(
        `Step ID of pushed message does not match current step ID. Offender: ${
          JSON.stringify(
            payload,
          )
        }, current Step ID: ${this.#sid}`,
      );
    }
    this.#commands.insert(this.#sid, type, payload);
  }

  *getCommands(
    start = this.#sid,
    end = this.#sid,
    filter: <Type extends MessageType>(
      type: Type,
      payload: MessagePlayloadByType[Type],
    ) => boolean = (_type, _payload) => true,
  ): Generator<[MessageType, AnyMessagePayload]> {
    for (const snapshot of this.#commands.slice(start, end)) {
      if (filter.apply(null, snapshot)) {
        yield snapshot;
      }
    }
  }

  #lastReceivedStepId = 0;
  #snapshotBuffer = new ArrayBuffer(1024);
  #snapshots = new MessageTimelineBuffer(
    this.#snapshotBuffer,
    this.#payloadMap,
  );
  addSnapshot(type: MessageType, payload: AnyMessagePayload) {
    this.#snapshots.insert(this.#sid, type, payload);
    this.#lastReceivedStepId = payload.sid;
  }

  insertSnapshot(type: MessageType, payload: AnyMessagePayload) {
    this.#snapshots.insert(payload.sid, type, payload);
    this.#lastReceivedStepId = payload.sid;
  }

  getSnapshots(
    start = this.#sid,
    end = this.#sid,
    filter: <Type extends MessageType>(
      type: Type,
      payload: MessagePlayloadByType[Type],
    ) => boolean = (_type, _payload) => true,
  ): Array<[MessageType, AnyMessagePayload]> {
    const result = [];
    for (const snapshot of this.#snapshots.slice(start, end)) {
      if (filter.apply(null, snapshot)) {
        result.push(snapshot);
      }
    }
    return result;
  }
}

export const MessageState = new MessageStateApi();
