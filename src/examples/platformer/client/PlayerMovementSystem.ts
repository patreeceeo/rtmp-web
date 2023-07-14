import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { Button } from "../../../modules/common/Button.ts";
import { hasComponent } from "../../../modules/common/Component.ts";
import {
  GroundedTag,
  ShoulderedTag,
} from "../../../modules/common/components.ts";
import { getDistanceSquared } from "../../../modules/common/math.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { PlayerState } from "../../../modules/common/state/Player.ts";
import { copy, getLengthSquared } from "../../../modules/common/Vec2.ts";
import { Player } from "../common/constants.ts";
import { applyPlayerJump } from "../common/functions.ts";
import { NegotiatePhysics, PlayerJump, PlayerMove } from "../common/message.ts";

/**
 * This system is responsible for moving the player in response to
 * input. It updates the local entity and send commands to the server
 * to update the corresponding entities across the network.
 */
export const PlayerMovementSystem: SystemLoader<ISystemExecutionContext> =
  () => {
    let jumpIntensity = 0;
    let wasJumpPressed = false;
    let doubleJump = false;

    function exec() {
      let ddx = 0;
      let startJump = false;
      // TODO(bug) the player can't run in the opposite direction of movement after hitting the ground until they release and repress the button
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
      const isJumpPressed = InputState.isButtonPressed(Button.Space);

      for (const player of PlayerState.entities.query()) {
        const nid = NetworkState.getId(player.eid)!;
        const isGrounded = hasComponent(GroundedTag, player);
        const isShouldered = hasComponent(ShoulderedTag, player);
        const running = Math.sign(ddx) !== Math.sign(player.acceleration.x);

        if (NetworkState.isLocal(nid)) {
          if (running) {
            console.log("run!");
            // Send move command
            // TODO local tag
            // TODO(authoritative server) send a direction and "intensity" not actual physical acceleration
            player.acceleration.x = ddx *
              (isGrounded || isShouldered
                ? Player.RUN_ACCELERATION
                : Player.FLY_ACCELERATION);
            MessageState.addCommand(PlayerMove, (p) => {
              copy(p.acceleration, player.acceleration);
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
          }

          if (isJumpPressed) {
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
            jumpIntensity > 0 && !isJumpPressed
          ) {
            startJump = true;
          }

          if (startJump && (isGrounded || isShouldered)) {
            console.log("jump!", jumpIntensity);
            applyPlayerJump(player, jumpIntensity);
            MessageState.addCommand(PlayerJump, (p) => {
              p.intensity = jumpIntensity;
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
            startJump = false;
            // console.log("reset A");
            jumpIntensity = 0;
          }

          if (isGrounded || isShouldered) {
            doubleJump = true;
          }

          if (!isGrounded && !isShouldered) {
            if (!wasJumpPressed && isJumpPressed && doubleJump) {
              console.log("double jump!");
              applyPlayerJump(player, Player.MAX_JUMP_INTENSITY);
              MessageState.addCommand(PlayerJump, (p) => {
                p.intensity = Player.MAX_JUMP_INTENSITY;
                p.nid = nid;
                p.sid = MessageState.currentStep;
              });
              startJump = false;
              doubleJump = false;
            }
            jumpIntensity = 0;
          }

          if (
            getDistanceSquared(
              player.targetPosition,
              player.previousTargetPosition_network,
            ) > getLengthSquared(player.velocity)
          ) {
            // Send negotiatePhysics command
            MessageState.addCommand(NegotiatePhysics, (p) => {
              copy(p.velocity, player.velocity);
              copy(p.position, player.position);
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
          }
        }
      } // const player of PlayerState.entities.query()
      wasJumpPressed = isJumpPressed;
    }
    return { exec };
  };
