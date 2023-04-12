import {
  AnyMessagePayload,
  createPayloadMap,
  MessageType,
} from "../../common/Message.ts";
import { MessageTimelineBuffer } from "../MessageTimelineBuffer.ts";

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
  #commandBuffer = new ArrayBuffer(2048);
  #commandsByStepCreated = new MessageTimelineBuffer(
    this.#commandBuffer,
    7,
    this.#payloadMap,
  );
  #commandsByStepReceived = new MessageTimelineBuffer(
    this.#commandBuffer,
    7,
    this.#payloadMap,
  );
  #sidNow = 0;
  #lastSentStepId = 0;

  /** Increment the ID number used to identify executions of the fixed pipeline.
   * Note: even if called every milisecond, it would take ~571,233 years for this
   * number to exceed Number.MAX_SAFE_INTEGER
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

  get lastReceivedStepId() {
    return this.#lastReceivedStepId;
  }

  addCommand(
    type: MessageType,
    payload: AnyMessagePayload,
    sidReceivedAt = this.#sidNow,
  ) {
    this.#commandsByStepReceived.insert(sidReceivedAt, type, payload);
    this.#commandsByStepCreated.insert(payload.sid, type, payload);
  }

  *getCommandsByStepCreated(
    start = this.#sidNow,
    end = start,
  ): Generator<[MessageType, AnyMessagePayload]> {
    for (const command of this.#commandsByStepCreated.slice(start, end)) {
      yield command;
    }
  }

  *getCommandsByStepReceived(
    start = this.#sidNow,
    end = start,
  ): Generator<[MessageType, AnyMessagePayload]> {
    for (const command of this.#commandsByStepReceived.slice(start, end)) {
      yield command;
    }
  }

  #lastReceivedStepId = 0;
  #snapshotBuffer = new ArrayBuffer(2048);
  #snapshotsByStepCreated = new MessageTimelineBuffer(
    this.#snapshotBuffer,
    7,
    this.#payloadMap,
  );
  #snapshotsByCommandStepCreated = new MessageTimelineBuffer(
    this.#snapshotBuffer,
    7,
    this.#payloadMap,
  );

  addSnapshot(
    type: MessageType,
    payload: AnyMessagePayload,
    sidCreatedAt = this.#sidNow,
  ) {
    this.#snapshotsByStepCreated.insert(sidCreatedAt, type, payload);
    this.#snapshotsByCommandStepCreated.insert(payload.sid, type, payload);
    this.#lastReceivedStepId = payload.sid;
  }

  *getSnapshotsByStepCreated(
    start = this.#sidNow,
    end = this.#sidNow,
  ): Generator<[MessageType, AnyMessagePayload]> {
    for (const snapshot of this.#snapshotsByStepCreated.slice(start, end)) {
      yield snapshot;
    }
  }

  *getSnapshotsByCommandStepCreated(
    start = this.#sidNow,
    end = this.#sidNow,
  ): Generator<[MessageType, AnyMessagePayload]> {
    for (
      const snapshot of this.#snapshotsByCommandStepCreated.slice(start, end)
    ) {
      yield snapshot;
    }
  }
}

export const MessageState = new MessageStateApi();
