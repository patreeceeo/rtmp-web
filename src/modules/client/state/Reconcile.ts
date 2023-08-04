import { IEntityBase } from "../../common/Entity.ts";
import { IPayloadAny } from "../../common/Message.ts";

export abstract class Reconciler<
  E extends IEntityBase,
  P extends IPayloadAny,
> {
  abstract query(_sstPayload: P): Iterable<E>;
  abstract reconcile(_entity: E, _sstPayload: P): void;
}

class ReconcileStateApi {
  reconcilers: Map<number, Reconciler<IEntityBase, IPayloadAny>> = new Map();
  register<
    E extends IEntityBase,
    P extends IPayloadAny,
  >(msgType: number, r: Reconciler<E, P>) {
    this.reconcilers.set(msgType, r);
  }
  get(msgType: number) {
    return this.reconcilers.get(msgType);
  }
  query() {
    return this.reconcilers.entries();
  }
}

export const ReconcileState = new ReconcileStateApi();
