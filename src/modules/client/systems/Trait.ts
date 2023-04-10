import { AnyMessagePayload } from "~/common/Message.ts";
import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { AnyTraitConstructor, TraitState } from "~/common/state/Trait.ts";
import { isJust, Just, Maybe, unboxJust } from "../../common/Maybe.ts";

function exec() {
  const traitCommandMaybes: Array<
    [AnyTraitConstructor, Maybe<AnyMessagePayload>]
  > = [];
  for (const trait of TraitState.getAll()) {
    traitCommandMaybes.push([
      TraitState.getType(trait.type),
      trait.getCommandMaybe(),
    ]);
  }

  const traitCommands: Array<[AnyTraitConstructor, AnyMessagePayload]> =
    traitCommandMaybes
      .filter(([_t, p]) => isJust(p))
      .map(([t, p]) => [t, unboxJust(p as Just<AnyMessagePayload>)]);

  for (const [Trait, payload] of traitCommands) {
    Trait.applyCommand(payload);
  }
  for (const [Trait, payload] of traitCommands) {
    MessageState.addCommand(Trait.commandType, payload);
  }
}

export const TraitSystem: SystemLoader = () => {
  return { exec };
};
