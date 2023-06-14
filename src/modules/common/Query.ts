import {
  defineQuery as _defineQuery,
  ISchema,
  Not as _Not,
  Query,
} from "bitecs";
import { AnyPropName, IAnyComponentType, IComponentType } from "./Component.ts";

export type IQuery = Query;

export function defineQuery(
  componentTypes: readonly IAnyComponentType[],
): IQuery {
  return _defineQuery(componentTypes.map((ct) => ct.queryable));
}

export function Not<S extends ISchema, PropName extends AnyPropName>(
  ct: IComponentType<S, PropName>,
): IComponentType<S, PropName> {
  return {
    ...ct,
    queryable: _Not(ct.queryable),
  };
}
