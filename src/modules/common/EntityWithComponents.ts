import {
  IAnyComponentType,
  WithPropertyForComponent,
} from "~/common/Component.ts";
import { TAGS } from "~/common/components.ts";
import { IEntityBase } from "~/common/Entity.ts";
type _EntityWithComponents<
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
> = WithPropertyForComponent<
  IEntityBase,
  ComponentTypes[number]["propName"]
>;

export type EntityWithComponents<
  ComponentTypes extends ReadonlyArray<IAnyComponentType>,
> = _EntityWithComponents<ComponentTypes | typeof TAGS>;
