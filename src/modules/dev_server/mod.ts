import { createHash } from "hash";
import { debounce } from "async";
import { common, relative } from "path";
import { HotSwapMessage, Message, HotSwapPayload } from "../dev_common/mod.ts";
import { sendIfOpen } from "../common/socket.ts";


export class HotSwapServer {
  #clientSockets: Array<WebSocket> = []
  constructor() {
    addModifyFileListener(this.handleModifyFile.bind(this), [
      Deno.cwd() + "/public",
    ]);
  }
  addClient(client: WebSocket) {
    client.onopen = this.handleOpen.bind(this);
    client.onclose = this.handleClose.bind(this);
    client.onerror = this.handleError.bind(this);
    client.onmessage = this.handleMessage.bind(this);
    this.#clientSockets.push(client)
  }
  handleOpen(_ev: Event) {
  }
  handleClose(_ev: Event) {
  }
  handleError(_ev: Event) {
  }
  handleMessage(_ev: Event) {
  }
  #broadcast(message: Message<HotSwapPayload>) {
    for(const client of this.#clientSockets) {
      sendIfOpen(client, message.serializeWithEnvelope());
    }
  }
  handleModifyFile(paths: IterableIterator<string>) {
    const message = HotSwapMessage.fromIterable(paths);
    this.#broadcast(message)
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
  // TODO multiple listeners being created, one per request.
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
