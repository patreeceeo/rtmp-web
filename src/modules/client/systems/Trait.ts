import { SystemLoader } from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { TraitConstructorAny, TraitState } from "~/common/state/Trait.ts";
import { isJust, Maybe, unboxJust } from "../../common/Maybe.ts";
import { IMessageDef, IWritePayload } from "../../common/Message.ts";
import { IPayloadAny } from "../../common/Message.ts";

function exec() {
  const traitCommandMaybes: Array<
    [
      TraitConstructorAny,
      Maybe<[IMessageDef<IPayloadAny>, IWritePayload<IPayloadAny>]>,
    ]
  > = [];
  for (const trait of TraitState.getAll()) {
    traitCommandMaybes.push([trait.getType(), trait.getCommandMaybe()]);
  }

  const traitCommands: Array<
    [
      TraitConstructorAny,
      [IMessageDef<IPayloadAny>, IWritePayload<IPayloadAny>],
    ]
  > = traitCommandMaybes
    .filter(([_t, m]) => isJust(m))
    .map((
      [t, m],
    ) => [
      t,
      unboxJust(m) as [IMessageDef<IPayloadAny>, IWritePayload<IPayloadAny>],
    ]);

  for (const [Trait, [msgType, write]] of traitCommands) {
    const payload = MessageState.addCommand(msgType, write);
    Trait.applyCommand(payload);
  }
}

export const TraitSystem: SystemLoader = () => {
  return { exec };
};
