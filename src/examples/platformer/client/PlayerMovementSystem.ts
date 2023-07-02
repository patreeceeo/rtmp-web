import { ISystemExecutionContext, SystemLoader } from "~/common/systems/mod.ts";
import { Button } from "../../../modules/common/Button.ts";
import { InputState } from "../../../modules/common/state/Input.ts";
import { MessageState } from "../../../modules/common/state/Message.ts";
import { NetworkState } from "../../../modules/common/state/Network.ts";
import { PlayerState } from "../../../modules/common/state/Player.ts";
import { copy, set } from "../../../modules/common/Vec2.ts";
import { Instance } from "../../../modules/common/Vec2.ts";
import { PlayerMove } from "../common/message.ts";

export const PlayerMovementSystem: SystemLoader<ISystemExecutionContext> =
  () => {
    const reAcceleration = new Instance();
    const maxAcceleration = 2;
    let lastDdx = 0;
    let lastDdy = 0;

    function exec() {
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

      if (inputChanged) {
        set(reAcceleration, ddx, ddy);
        for (const player of PlayerState.entities.query()) {
          const nid = NetworkState.getId(player.eid)!;
          // TODO local tag
          if (NetworkState.isLocal(nid)) {
            copy(player.acceleration, reAcceleration);
            MessageState.addCommand(PlayerMove, (p) => {
              copy(p.acceleration, reAcceleration);
              p.nid = nid;
              p.sid = MessageState.currentStep;
            });
          }
        }
      }
    }
    return { exec };
  };
