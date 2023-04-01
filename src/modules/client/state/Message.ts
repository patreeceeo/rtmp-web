import { DataViewMovable } from "../../common/DataView.ts";
import {
  AnyMessagePayload,
  IAnyMessage,
  IAnyMessageMutable,
  MessageMutable,
  MessageType,
  NilPayloadMutable,
  PlayerMove,
  PlayerMoveMutable,
} from "../../common/Message.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { Vec2 } from "../../common/Vec2.ts";

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
  #commandBuffer = new ArrayBuffer(256);
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
  #recycledMessage = new MessageMutable(
    MessageType.nil,
    new NilPayloadMutable(),
  ) as IAnyMessageMutable;
  #reusedPlayerMove = new PlayerMoveMutable(new Vec2(), 0 as NetworkId, 0);
  #commandSidToBufferMap: Array<number> = [];

  #snapshotBuffer = new ArrayBuffer(256);
  #snapshotBufferView = new DataViewMovable(this.#snapshotBuffer, {
    isCircular: true,
  });
  #lastSnapshot = new MessageMutable(MessageType.nil, new NilPayloadMutable());
  #lastPlayerMove = new PlayerMoveMutable(new Vec2(), 0 as NetworkId, 0);

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

  pushUnsentCommand(type: MessageType, payload: AnyMessagePayload) {
    // TODO shouldn't all command payloads have sids?
    if ("sid" in payload && payload.sid !== this.#sid) {
      throw new Error(
        `Step ID of pushed message does not match current step ID. Offender: ${
          JSON.stringify(payload)
        }, current Step ID: ${this.#sid}`,
      );
    }
    const bufferOffset = this.#lastUnsentCommandBufferView.byteOffset;
    const sidModulus = this.#sid % this.MAX_LAG;
    const cmd = this.#recycledMessage;
    cmd.type = type;
    (cmd as IAnyMessage).payload = payload;
    cmd.write(this.#lastUnsentCommandBufferView);
    this.#unsentCommandCount++;
    this.#commandSidToBufferMap[sidModulus] = bufferOffset;
  }

  *getUnsentCommands(): Generator<[MessageType, AnyMessagePayload]> {
    let count = this.#unsentCommandCount;
    const originalOffset = this.#unsentBufferView.byteOffset;
    while (count > 0) {
      const cmd = this.#recycledMessage;
      cmd.read(this.#unsentBufferView);
      yield [cmd.type, cmd.payload];
      count--;
    }
    this.#unsentBufferView.jump(originalOffset);
  }

  markAllCommandsAsSent() {
    this.#unsentCommandCount = 0;
    this.#unsentBufferView.jump(this.#lastUnsentCommandBufferView.byteOffset);
    this.#lastSentStepId = this.#sid;
  }

  /**
   * Get commands in buffer added after the given Step ID
   */
  *getCommandsSentAfter(sid: number) {
    // Prevent infinite loop
    // TODO what causes the infinite loop?
    let count = 0;
    const command = this.#reusedPlayerMove;
    const sidModulus = sid + 1 % this.MAX_LAG;
    if (sidModulus in this.#commandSidToBufferMap) {
      this.#serverBufferView.jump(this.#commandSidToBufferMap[sidModulus]);
      do {
        command.read(this.#serverBufferView);
        yield command;
        count++;
      } while (command.sid < this.#lastSentStepId && count < this.MAX_LAG);
    }
  }

  // TODO use a different type for server response because it's not a delta when
  // coming from the server, it's an absolute position. Also, might have multiple
  // types of messages for player moves being sent to the server (like duck, jump,
  // etc), but the server only needs 1 type of message.
  pushSnapshot(type: MessageType, payload: PlayerMove) {
    const cmd = this.#recycledMessage;
    cmd.type = type;
    (cmd as IAnyMessage).payload = payload;
    this.#snapshotBufferView.jump(0);
    cmd.write(this.#snapshotBufferView);
  }

  get lastSnapshot(): IAnyMessage {
    const snapshot = this.#recycledMessage;
    this.#snapshotBufferView.jump(0);
    snapshot.read(this.#snapshotBufferView);
    return snapshot;
  }
}

export const MessageState = new MessageStateApi(100);
