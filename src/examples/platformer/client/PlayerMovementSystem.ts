import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { Button } from "../../../modules/common/Button.ts";
import { hasComponent } from "../../../modules/common/Component.ts";
import { GroundedTag } from "../../../modules/common/components.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { PlayerState } from "../../../modules/common/state/Player.ts";
import {
  almostEquals,
  copy,
  getLengthSquared,
} from "../../../modules/common/Vec2.ts";
import { Player } from "../common/constants.ts";
import { NegotiatePhysics, PlayerJump, PlayerMove } from "../common/message.ts";

/**
 * This system is responsible for moving the player in response to
 * input. It updates the local entity and send commands to the server
 * to update the corresponding entities across the network.
 */
export const PlayerMovementSystem: SystemLoader<ISystemExecutionContext> =
  () => {
    let lastSendTime = 0;
    let jumpIntensity = 0;

    function exec(context: ISystemExecutionContext) {
      let ddx = 0;
      let startJump = false;
      if (
        InputState.isButtonPressed(Button.KeyA) ||
        InputState.isButtonPressed(Button.KeyJ)
      ) {
        ddx = -1;
      }
      if (
        InputState.isButtonPressed(Button.KeyD) ||
        InputState.isButtonPressed(Button.KeyL)
      ) {
        ddx = 1;
      }

      for (const player of PlayerState.entities.query()) {
        const speedSquared = getLengthSquared(player.velocity);
        const interval = speedSquared / 80;
        const nid = NetworkState.getId(player.eid)!;
        const isGrounded = hasComponent(GroundedTag, player);
        const running = Math.sign(ddx) !== Math.sign(player.acceleration.x);

        if (NetworkState.isLocal(nid)) {
          if (running) {
            console.log("run!");
            // Send move command
            // TODO local tag
            player.acceleration.x = ddx *
              (isGrounded ? Player.RUN_ACCELERATION : Player.FLY_ACCELERATION);
            MessageState.addCommand(PlayerMove, (p) => {
              copy(p.acceleration, player.acceleration);
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
          }

          if (InputState.isButtonPressed(Button.Space)) {
            jumpIntensity = Math.min(
              Player.MAX_JUMP_INTENSITY,
              jumpIntensity +
                Math.ceil(
                  (255 - jumpIntensity) /
                    Player.JUMP_INTENSITY_DIMINISHMENT_FACTOR,
                ),
            );
          }

          if (
            jumpIntensity > 0 && !InputState.isButtonPressed(Button.Space) ||
            jumpIntensity === Player.MAX_JUMP_INTENSITY
          ) {
            startJump = true;
          }

          if (startJump && isGrounded) {
            console.log("jump!", jumpIntensity);
            // TODO constants
            player.maxSpeed = Player.MAX_FALL_SPEED;
            player.velocity.y = -1 * Player.MAX_JUMP_SPEED *
              (jumpIntensity / Player.MAX_JUMP_INTENSITY);
            MessageState.addCommand(PlayerJump, (p) => {
              p.intensity = jumpIntensity;
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
            startJump = false;
            jumpIntensity = 0;
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
