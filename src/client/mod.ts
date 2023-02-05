import { composeUpdateRequest, ExitMessage, MessageFromServer, MessagePayloadFromServer, UpdateMessage, WelcomeMessage } from "../common/Message.ts";
import { createState } from "../common/State.ts";

const handleWelcome = ({networkId}: WelcomeMessage["payload"]) => {
  state.localPlayer.networkId = networkId
  state.networkedEntities[networkId] = {x: 100, y: 100}
}
const handleUpdate = (updatedEntities: UpdateMessage["payload"]) => {
  Object.assign(state.networkedEntities, updatedEntities)
}
const handleEnter = () => {}
const handleExit = ({networkId}: ExitMessage["payload"]) => {
  delete state.networkedEntities[networkId]
}

const wsProtocol = location.origin.startsWith('https') ? 'wss' : 'ws'

const socket = new WebSocket(
  `${wsProtocol}://${location.host}/start_web_socket`,
);

socket.onmessage = (message) => {
  const parsedMessage = JSON.parse(message.data) as MessageFromServer;

  const handler = socketRouter[parsedMessage.type]
  if(handler) {
    handler(parsedMessage.payload as MessagePayloadFromServer)
  } else {
    console.warn("No handler for", parsedMessage.type)
  }
};

window.onload = () => {
  requestAnimationFrame(updateScreen)
};

window.onkeydown = (ev) => {
  switch(ev.code) {
    case "KeyA": {
      move(-1, 0)
    }
    break
    case "KeyW": {
      move(0, 1)
    }
    break
    case "KeyS": {
      move(0, -1)
    }
    break
    case "KeyD": {
      move(1, 0)
    }
  }
}

const move = (x: number, y: number) => {
  if(state.localPlayer.networkId) {
    const localEntity = state.networkedEntities[state.localPlayer.networkId!]
    localEntity.x += x
    localEntity.y += y
    socket.send(JSON.stringify(composeUpdateRequest(state.networkedEntities)))
  } else {
    console.warn("Trying to move without a network connection")
  }
}

const socketRouter = {
  welcome: handleWelcome,
  update: handleUpdate,
  enter: handleEnter,
  exit: handleExit
}

const state = createState()

const updateScreen = () => {
  const el = document.querySelector("#screen")
  el!.innerHTML = JSON.stringify(state, null, 4)
  requestAnimationFrame(updateScreen)
}


