import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { Uuid } from "../../../modules/common/NetworkApi.ts";
import {
  MessageState,
  SID_ORIGIN,
} from "../../../modules/common/state/Message.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { PlayerState } from "../../../modules/common/state/Player.ts";
import {
  add,
  clamp,
  copy,
  Instance,
  sub,
} from "../../../modules/common/Vec2.ts";
import { applyPlayerJump } from "../common/functions.ts";
import {
  INegotiatePhysics,
  IPlayerJump,
  IPlayerMove,
  IPlayerSnapshot,
  NegotiatePhysics,
  PlayerJump,
  PlayerMove,
  PlayerSnapshot,
} from "../common/message.ts";
import { LifeComponent } from "~/common/components.ts";

let lastHandledStep = SID_ORIGIN;
const lastHandledStepByClient = new Map<Uuid, number>();
const tempPositionDelta = new Instance();
const tempVelocityDelta = new Instance();
const MAX_POSITION_DELTA = 2000;
const MAX_VELOCITY_DELTA = 1500;

/** This system is responsible for moving the player in response to
 * commands from clients. It should verify that the client is allowed to move the player in question and (TODO) that the move is legal.
 */
export const PlayerMovementSystem: SystemLoader<
  ISystemExecutionContext
> = () => {
  function exec() {
    const cmds = MessageState.getCommandsByStepReceived(
      lastHandledStep,
      MessageState.currentStep,
    );
    for (const [cmdType, cmdPayload] of cmds) {
      lastHandledStepByClient.set(cmdPayload.nid, cmdPayload.sid);
      const playerEid = NetworkState.getEntityId(cmdPayload.nid)!;
      const player = PlayerState.entities.get(playerEid);
      if (!player) {
        console.error(
          "Player not found, nid",
          cmdPayload.nid,
          "eid",
          playerEid,
        );
        continue;
      }
      switch (cmdType) {
        case PlayerMove.type:
          {
            if (
              cmdPayload.sid >=
                (lastHandledStepByClient.get(cmdPayload.nid) || -1)
            ) {
              const move = cmdPayload as IPlayerMove;
              copy(player.acceleration, move.acceleration);
            }
          }
          break;
        case PlayerJump.type:
          {
            const jump = cmdPayload as IPlayerJump;
            applyPlayerJump(player, jump.intensity);
            MessageState.addSnapshot(PlayerSnapshot, (p: IPlayerSnapshot) => {
              copy(p.position, player.targetPosition);
              copy(p.velocity, player.velocity);
              p.pose = player.pose;
              p.nid = cmdPayload.nid;
              p.sid = MessageState.currentStep;
            });
          }
          break;
        case NegotiatePhysics.type: {
          const { position, velocity } = cmdPayload as INegotiatePhysics;
          copy(tempPositionDelta, position);
          sub(tempPositionDelta, player.position);
          copy(tempVelocityDelta, velocity);
          sub(tempVelocityDelta, player.velocity);
          clamp(tempPositionDelta, MAX_POSITION_DELTA);
          clamp(tempVelocityDelta, MAX_VELOCITY_DELTA);

          add(player.position, tempPositionDelta);
          add(player.velocity, tempVelocityDelta);
        }
      }
    }
    lastHandledStep = MessageState.currentStep;
  }
  return { exec };
};
