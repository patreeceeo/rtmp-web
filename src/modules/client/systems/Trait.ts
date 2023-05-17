import {
  ISystemExecutionContext,
  SystemLoader,
} from "../../common/systems/mod.ts";
import { MessageState } from "~/common/state/Message.ts";
import { ITraitConstructorAny, TraitState } from "~/common/state/Trait.ts";
import { isJust, Maybe, unboxJust } from "../../common/Maybe.ts";
import { IMessageDef, IWritePayload } from "../../common/Message.ts";
import { IPayloadAny } from "../../common/Message.ts";
import { NetworkState } from "../../common/state/Network.ts";

function exec(context: ISystemExecutionContext) {
  const traitCommandMaybes: Array<
    [
      ITraitConstructorAny,
      Maybe<[IMessageDef<IPayloadAny>, IWritePayload<IPayloadAny>]>,
    ]
  > = [];
  for (const trait of TraitState.getAll()) {
    traitCommandMaybes.push([trait.getType(), trait.getCommandMaybe(context)]);
  }

  const traitCommands: Array<
    [
      ITraitConstructorAny,
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
    MessageState.setLastSentStepId(payload.nid, payload.sid);
    const eid = NetworkState.getEntityId(payload.nid)!;
    const trait = TraitState.getTrait(Trait, eid);
    if (trait) {
      trait.applyCommand(payload, context);
    }
  }
}

export const TraitSystem: SystemLoader = () => {
  return { exec };
};
