import {
  createWorld,
  defineDeserializer as _defineDeserializer,
  defineSerializer as _defineSerializer,
  DESERIALIZE_MODE,
  IWorld as _IWorld,
} from "bitecs";
import { IAnyComponentType } from "~/common/Component.ts";

export const defaultWorld = Object.assign(createWorld(), {
  delta: 0,
  elapsed: 0,
  then: performance.now(),
});

export type IWorld = _IWorld;

export function defineSerializer(components: IAnyComponentType[]) {
  return _defineSerializer(components.map((c) => c.store));
}
export function defineDeserializer(components: IAnyComponentType[]) {
  const _deserialize = _defineDeserializer(
    components.map((c) => c.store),
  );
  return (data: ArrayBuffer, world = defaultWorld) => {
    return _deserialize(world as unknown as any, data, DESERIALIZE_MODE.MAP);
  };
}
