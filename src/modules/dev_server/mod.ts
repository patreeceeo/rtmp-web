/**
 * A server-side implementation of the ESM-HMR spec, for real.
 * See https://github.com/FredKSchott/esm-hmr
 */
import { serve } from "http";
import { EsmHmrEngine } from "hot_mod/server/mod.ts";
import { addModuleEventHandler } from "../dev_common/mod.ts";


const engine = new EsmHmrEngine((emitModuleModifiedEvent) => {
  addModuleEventHandler(["modify"], (paths) => {
    for (const path of paths) {
      emitModuleModifiedEvent("/" + path);
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
