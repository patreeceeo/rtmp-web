/**
 * A server-side implementation of the ESM-HMR spec, for real.
 * See https://github.com/FredKSchott/esm-hmr
 */
import { serve } from "http";
import { relative } from "path";
import { debounce } from "async";

interface Dependency {
  dependents: Set<string>;
  dependencies: Set<string>;
  isHmrEnabled: boolean;
  isHmrAccepted: boolean;
  needsReplacement: boolean;
}

export class EsmHmrEngine {
  clients: Set<WebSocket> = new Set();
  dependencyTree = new Map<string, Dependency>();

  constructor() {
    addModifyFileListener((urls) => {
      for (const url of urls) {
        this.broadcastMessage({ type: "update", url });
      }
    }, [
      Deno.cwd() + "/public",
    ]);
  }

  addClient(client: WebSocket): void {
    const onopen = () => {
      this.connectClient(client);
      this.registerListener(client);
    };
    client.onopen = onopen;
    if (client.readyState === WebSocket.OPEN) {
      onopen();
    }
    client.onerror = () => {
      console.warn(`Socket error!`);
    };
    client.onclose = () => {
      console.info("socket closed");
      this.clients.delete(client);
    };
  }

  registerListener(client: WebSocket) {
    client.onmessage = (event) => {
      console.info("received message:", event.data);
      const message = JSON.parse(event.data.toString());
      if (message.type === "hotAccept") {
        const entry = this.getEntry(message.id, true) as Dependency;
        entry.isHmrAccepted = true;
      }
    };
  }

  createEntry(sourceUrl: string) {
    const newEntry: Dependency = {
      dependencies: new Set(),
      dependents: new Set(),
      needsReplacement: false,
      isHmrEnabled: false,
      isHmrAccepted: false,
    };
    this.dependencyTree.set(sourceUrl, newEntry);
    return newEntry;
  }

  getEntry(sourceUrl: string, createIfNotFound = false) {
    const result = this.dependencyTree.get(sourceUrl);
    if (result) {
      return result;
    }
    if (createIfNotFound) {
      return this.createEntry(sourceUrl);
    }
    return null;
  }

  setEntry(sourceUrl: string, imports: string[], isHmrEnabled = false) {
    const result = this.getEntry(sourceUrl, true)!;
    const outdatedDependencies = new Set(result.dependencies);
    result.isHmrEnabled = isHmrEnabled;
    for (const importUrl of imports) {
      this.addRelationship(sourceUrl, importUrl);
      outdatedDependencies.delete(importUrl);
    }
    for (const importUrl of outdatedDependencies) {
      this.removeRelationship(sourceUrl, importUrl);
    }
  }

  removeRelationship(sourceUrl: string, importUrl: string) {
    const importResult = this.getEntry(importUrl);
    importResult && importResult.dependents.delete(sourceUrl);
    const sourceResult = this.getEntry(sourceUrl);
    sourceResult && sourceResult.dependencies.delete(importUrl);
  }

  addRelationship(sourceUrl: string, importUrl: string) {
    if (importUrl !== sourceUrl) {
      const importResult = this.getEntry(importUrl, true)!;
      importResult.dependents.add(sourceUrl);
      const sourceResult = this.getEntry(sourceUrl, true)!;
      sourceResult.dependencies.add(importUrl);
    }
  }

  markEntryForReplacement(entry: Dependency, state: boolean) {
    entry.needsReplacement = state;
  }

  broadcastMessage(data: Record<string, unknown>) {
    console.log("broadcast:", data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      } else {
        this.disconnectClient(client);
      }
    });
  }

  connectClient(client: WebSocket) {
    console.info("client connected");
    this.clients.add(client);
  }

  disconnectClient(client: WebSocket) {
    client.close();
    this.clients.delete(client);
  }

  disconnectAllClients() {
    for (const client of this.clients) {
      this.disconnectClient(client);
    }
  }
}

interface FsListener {
  (paths: IterableIterator<string>): void;
}

let listenerCount = 0;
const modifiedModuleUrls = new Set<string>();
async function addModifyFileListener(
  listener: FsListener,
  absPaths: Array<string>,
) {
  const watcher = Deno.watchFs(absPaths, { recursive: true });

  const debouncedListener = debounce(() => {
    const copy = new Set(modifiedModuleUrls);
    listener(copy.values());
    modifiedModuleUrls.clear();
  }, 200);

  listenerCount++;
  console.log(
    `Starting modify file listener #${listenerCount} for ${
      absPaths.join(", ")
    }`,
  );

  for await (const event of watcher) {
    if (event.kind === "modify") {
      for (const path of event.paths) {
        const cwdRelativePath = relative(Deno.cwd(), path);
        // TODO there's some confusing naming conventions going on in this code
        // The names "id" and "url" are used to refer to the same things, and those
        // things are actually path(name)s.
        modifiedModuleUrls.add("/" + cwdRelativePath);
      }
    }
    if (modifiedModuleUrls.size > 0) {
      debouncedListener();
    }
  }
}

const engine = new EsmHmrEngine();
serve((request) => {
  const { socket, response } = Deno.upgradeWebSocket(request);
  engine.addClient(socket);
  return response;
}, { port: 12321 });

// TODO use subprotocol once I figure out how to do that in Deno
// if (request.headers.get("sec-websocket-protocol") === "esm-hmr") {
// const { socket, response } = Deno.upgradeWebSocket(request);
// engine.addClient(socket)
// return new Response(null, {
//   status: response.status,
//   statusText: response.statusText,
//   headers: {
//     connection: response.headers.get("connection")!,
//     "sec-websocket-accept": response.headers.get("sec-websocket-accept")!,
//     upgrade: response.headers.get("upgrade")!,
//     "sec-websocket-protocol": "esm-hmr"
//   }
// })
// } else {
//   return new BadRequestResponse()
// }
