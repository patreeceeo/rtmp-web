import { createHash } from "hash";
import { debounce } from "async";
import { common, relative } from "path";

type SerializedData = Parameters<WebSocket["send"]>[0];

interface Message<Payload> {
  payload: Payload;
  type: MessageType;
  serializeWithEnvelope(): SerializedData;
}

interface MessageEnvelope<Payload> {
  messageType: MessageType;
  payload: Payload;
}
export interface HotSwapPayload {
  paths: Array<string>;
}
export class HotSwapMessage implements Message<HotSwapPayload> {
  static fromIterable(paths: IterableIterator<string>) {
    const payload: HotSwapPayload = { paths: [] };
    for (const path of paths) {
      payload.paths.push(path);
    }
    return new HotSwapMessage(payload);
  }
  _payload: HotSwapPayload = {
    paths: [],
  };
  constructor(payload: HotSwapPayload) {
    this.payload = payload;
  }
  type = MessageType.hotSwap;
  serializeWithEnvelope() {
    return JSON.stringify(createMessageEnvelope(this.type, this.payload));
  }
  set payload(payload: this["_payload"]) {
    this._payload = payload;
  }
  get payload() {
    return this._payload;
  }
}

function createMessageEnvelope<Payload>(
  type: MessageType,
  payload: Payload,
): MessageEnvelope<Payload> {
  return { messageType: type, payload };
}

const messageClassByType = [HotSwapMessage];
export enum MessageType {
  hotSwap,
}

export function parseMessage(serializedData: string): HotSwapMessage {
  const parsed = JSON.parse(serializedData) as MessageEnvelope<HotSwapPayload>;
  const MessageClass = messageClassByType[parsed.messageType];
  return new MessageClass(parsed.payload);
}

export class HotSwapServer {
  constructor(private client: WebSocket) {
    client.onopen = this.handleOpen.bind(this);
    client.onclose = this.handleClose.bind(this);
    client.onerror = this.handleError.bind(this);
    client.onmessage = this.handleMessage.bind(this);
    addModifyFileListener(this.handleModifyFile.bind(this), [
      Deno.cwd() + "/public",
    ]);
  }
  handleOpen(_ev: Event) {
  }
  handleClose(_ev: Event) {
  }
  handleError(_ev: Event) {
  }
  handleMessage(_ev: Event) {
  }
  handleModifyFile(paths: IterableIterator<string>) {
    const message = HotSwapMessage.fromIterable(paths);
    this.client.send(message.serializeWithEnvelope());
  }
}

interface FsListener {
  (paths: IterableIterator<string>): void;
}

let listenerCount = 0;
const modifiedPaths = new Set<string>();

export async function addModifyFileListener(
  listener: FsListener,
  absPaths: Array<string>,
) {
  const watcher = Deno.watchFs(absPaths, { recursive: true });
  const commonPath = common(absPaths);

  const debouncedListener = debounce(() => {
    const copy = new Set(modifiedPaths);
    listener(copy.values());
    modifiedPaths.clear();
  }, 200);

  listenerCount++;
  console.log(
    `Starting modify file listener #${listenerCount} for ${
      absPaths.join(", ")
    }`,
  );

  for await (const event of watcher) {
    if (event.kind === "modify") {
      console.log(`Received modify event for ${event.paths.join(", ")}`);
      for (const path of event.paths) {
        modifiedPaths.add("/" + relative(commonPath, path));
      }
    }
    if (modifiedPaths.size > 0) {
      debouncedListener();
    }
  }
}
