// TODO make this an option arg
import { WORLD_DIMENSIONS } from "../../../examples/dots/mod.ts";
import { ClientNetworkState } from "../../client/state/Network.ts";
import { ColorChange, MessageType, PlayerMove, PlayerMoveWritable } from "~/common/Message.ts";
import { Vec2 } from "../../common/Vec2.ts";
import { NetworkId } from "../../common/state/Network.ts";
import { PlayerState } from "../../common/state/Player.ts";
import { InputState } from "../../common/state/Input.ts";
import { Time } from "../../common/state/Time.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { RingBuffer } from "../../common/RingBuffer.ts";
import { sendMessageToServer } from "../mod.ts";

/** authoritative */
function acceptMoveFromServer(to: Vec2, nid: NetworkId) {
  const eid = ClientNetworkState.getEntityId(nid);
  if (PlayerState.hasPlayer(eid!)) {
    const player = PlayerState.getPlayer(eid!);
    // Server sends back correct position
    player.position.copy(to)
  } else {
    console.warn(`Requested moving unknown player with nid ${nid}`);
  }
}

function exec() {
  // loop thru local entities
  for (const eid of PlayerState.getPlayerEids()) {
    // TODO the server should determine whether a client is allowed to control an entity
    if (ClientNetworkState.isLocalEntity(eid)) {
      const player = PlayerState.getPlayer(eid);
      const nid = ClientNetworkState.getId(eid);
      const velocity = player.MAX_VELOCITY;
      const {x, y} = player.position;
      let dx = 0,
        dy = 0;
      if (InputState.isKeyPressed("KeyA") && x > player.width) {
        dx = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyW") && y > player.height) {
        dy = -1 * velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyS") && y < WORLD_DIMENSIONS.HEIGHT - player.height) {
        dy = velocity * Time.delta;
      }
      if (InputState.isKeyPressed("KeyD") && x < WORLD_DIMENSIONS.WIDTH - player.width) {
        dx = velocity * Time.delta;
      }
      player.position.x += dx
      player.position.y += dy
      if (dx !== 0 || dy !== 0) {
        const sid = clientBuffer.writeIndex
        to.set(dx, dy)
        const move = new PlayerMove(to, nid!, sid)
        clientBuffer.put().copy(move)
        sendMessageToServer(
          MessageType.playerMoved,
          move
        );
      }

      if (InputState.isKeyPressed("KeyQ")) {
        player.color = player.color === 0 ? 6 : player.color - 1
        sendMessageToServer(MessageType.colorChange, new ColorChange(player.color, nid!))
      }
      if (InputState.isKeyPressed("KeyE")) {
        player.color = (player.color + 1) % 6
        sendMessageToServer(MessageType.colorChange, new ColorChange(player.color, nid!))
      }
    }
  }
}

function applyPlayerMove(delta: Vec2, nid: NetworkId) {
  const eid = ClientNetworkState.getEntityId(nid)
  const player = PlayerState.getPlayer(eid!)
  player.position.add(delta)
}

export const ClientMovementSystem: SystemLoader = () => {
  return { exec, events: {} };
};

const to = new Vec2()

/** moves awaiting server acknowlogement */
const clientBuffer = new RingBuffer<PlayerMove, PlayerMoveWritable>(() => new PlayerMoveWritable(), 10)

// TODO use a different type for server response because it's not a delta when
// coming from the server, it's an absolute position. Also, might have multiple
// types of messages for player moves being sent to the server (like duck, jump,
// etc), but the server only needs 1 type of message.
export function handleMoveFromServer(moveFromServer: PlayerMove) {
  acceptMoveFromServer(moveFromServer.delta, moveFromServer.nid)
  if(moveFromServer.sid < clientBuffer.writeIndex) {
    for(const move of clientBuffer.values(moveFromServer.sid + 1, clientBuffer.writeIndex)) {
      if(move.nid === moveFromServer.nid) {
        // predict that the server will accept our moves
        applyPlayerMove(move.delta, move.nid)
      }
    }
  }
}
