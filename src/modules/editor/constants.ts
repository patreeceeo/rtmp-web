import {
  GroundedTag,
  ImageCollectionComponent,
  PlayerTag,
  PoseComponent,
  TileTag,
  UuidComponent,
} from "~/common/components.ts";

export const EDITOR_BROADCAST_CHANNEL = "editor";

export const EDITOR_COMPONENTS = [
  UuidComponent,
  PlayerTag,
  GroundedTag,
  TileTag,
  ImageCollectionComponent,
  PoseComponent,
];
