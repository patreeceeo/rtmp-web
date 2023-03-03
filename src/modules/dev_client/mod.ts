
// TODO move to (dev_)common
import {
  HotSwapPayload,
  MessageType,
  parseMessage,
} from "~/dev_server/mod.ts";

const wsProtocol = location.origin.startsWith("https") ? "wss" : "ws";
const devSocket = new WebSocket(
  `${wsProtocol}://${location.host}/dev_socket`,
);
devSocket.onmessage = (event) => {
  const message = parseMessage(event.data);

  const handler = devSocketRouter[message.type];
  if (handler) {
    handler(message.payload);
  } else {
    console.warn("No handler for", message.type);
  }
};

const devSocketRouter = {
  [MessageType.hotSwap]: handleHotSwap,
};

function handleHotSwap(msg: HotSwapPayload) {
  const scriptsByPath: Record<string, HTMLScriptElement> = {};
  for (const el of document.head.querySelectorAll("script")) {
    const path = (new URL(el.src)).pathname;
    scriptsByPath[path] = el;
  }
  setTimeout(() => {
    for (const path of msg.paths) {
      reloadScript(scriptsByPath[path]);
    }
  });
}

let cachePrevention = 0;
function bustCache(href: string) {
  const [start, _] = href.split("?");
  cachePrevention++;
  return `${start}?v=${cachePrevention}`;
}
function reloadScript(oldScript: HTMLScriptElement) {
  const script = document.createElement("script");
  script.src = bustCache(oldScript.src);
  script.type = oldScript.type;
  document.head.removeChild(oldScript);
  document.head.appendChild(script);
}
