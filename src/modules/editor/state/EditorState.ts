import { EntityId } from "~/common/Entity.ts";

class EditorStateApi {
  selectedEntityId?: EntityId;
}

export const EditorState = new EditorStateApi();
