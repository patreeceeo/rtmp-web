import { Uuid } from "~/common/NetworkApi.ts";

class EditorStateApi {
  selectedUuid?: Uuid;
}

export const EditorState = new EditorStateApi();
