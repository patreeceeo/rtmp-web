import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { Button } from "../../../modules/common/Button.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { PlayerState } from "../../../modules/common/state/Player.ts";
import {
  almostEquals,
  copy,
  getLengthSquared,
  set,
} from "../../../modules/common/Vec2.ts";
import { NegotiatePhysics, PlayerMove } from "../common/message.ts";

/**
 * This system is responsible for moving the player in response to
 * input. It updates the local entity and send commands to the server
 * to update the corresponding entities across the network.
 */
export const PlayerMovementSystem: SystemLoader<ISystemExecutionContext> =
  () => {
    const maxAcceleration = 2;
    let lastDdx = 0;
    let lastDdy = 0;
    let lastSendTime = 0;

    function exec(context: ISystemExecutionContext) {
      let ddx = 0,
        ddy = 0;
      if (
        InputState.isButtonPressed(Button.KeyA) ||
        InputState.isButtonPressed(Button.KeyJ)
      ) {
        ddx = -maxAcceleration;
      }
      if (
        InputState.isButtonPressed(Button.KeyW) ||
        InputState.isButtonPressed(Button.KeyI)
      ) {
        ddy = -maxAcceleration;
      }
      if (
        InputState.isButtonPressed(Button.KeyS) ||
        InputState.isButtonPressed(Button.KeyK)
      ) {
        ddy = maxAcceleration;
      }
      if (
        InputState.isButtonPressed(Button.KeyD) ||
        InputState.isButtonPressed(Button.KeyL)
      ) {
        ddx = maxAcceleration;
      }
      const inputChanged = ddx !== lastDdx || ddy !== lastDdy;
      lastDdx = ddx;
      lastDdy = ddy;

      for (const player of PlayerState.entities.query()) {
        const speedSquared = getLengthSquared(player.velocity);
        const interval = speedSquared / 80;
        const nid = NetworkState.getId(player.eid)!;
        if (NetworkState.isLocal(nid)) {
          if (inputChanged) {
            // Send move command
            // TODO local tag
            set(player.acceleration, ddx, ddy);
            MessageState.addCommand(PlayerMove, (p) => {
              set(p.acceleration, ddx, ddy);
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
          }
          if (
            context.elapsedTime - lastSendTime > interval &&
            !almostEquals(player.targetPosition, player.position) &&
            speedSquared > 0
          ) {
            // Send negotiatePhysics command
            lastSendTime = context.elapsedTime;
            MessageState.addCommand(NegotiatePhysics, (p) => {
              copy(p.velocity, player.velocity);
              copy(p.position, player.position);
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
          }
        }
      }
    }
    return { exec };
  };
