/**
 * A server-side implementation of the ESM-HMR spec, for real.
 * See https://github.com/FredKSchott/esm-hmr
 */
import { serve } from "http";
import { relative } from "path";
import { debounce } from "async";
import { EsmHmrEngine } from "hot_mod/server/mod.ts";

interface ModuleEventHandler {
  (paths: IterableIterator<string>): void;
}

let listenerCount = 0;
const modifiedModuleUrls = new Set<string>();
async function addModuleEventHandler(
  handler: ModuleEventHandler,
  absPaths: Array<string>,
) {
  const watcher = Deno.watchFs(absPaths, { recursive: true });

  const debouncedListener = debounce(() => {
    const copy = new Set(modifiedModuleUrls);
    handler(copy.values());
    modifiedModuleUrls.clear();
  }, 200);

  listenerCount++;
  console.log(
    `Module event handler #${listenerCount} for ${absPaths.join(", ")}`,
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

const engine = new EsmHmrEngine((emitModuleModifiedEvent) => {
  addModuleEventHandler((paths) => {
    for (const path of paths) {
      emitModuleModifiedEvent(path);
    }
  }, [Deno.cwd() + "/public"]);
});
serve((request) => {
  // TODO use subprotocol once I figure out how to do that in Deno
  // if (request.headers.get("sec-websocket-protocol") === "esm-hmr") {
  const { socket, response } = Deno.upgradeWebSocket(request);
  engine.addClient(socket);
  return response;
  // }
}, { port: 12321 });
