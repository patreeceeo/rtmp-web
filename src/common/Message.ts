import { NetworkEntityRecord, NetworkId } from "./State.ts";

export interface BaseMessage<Type extends string, Payload> {
  type: Type;
  payload: Payload;
}

export type WelcomeMessage = BaseMessage<"welcome", { networkId: NetworkId }>;
export const composeWelcome = (networkId: NetworkId): WelcomeMessage => ({
  type: "welcome",
  payload: { networkId }
})

export type UpdateRequestMessage = BaseMessage<"updateRequest", NetworkEntityRecord>;
export const composeUpdateRequest = (networkedEntities: NetworkEntityRecord) => ({
  type: "updateRequest",
  payload: networkedEntities
})

export type UpdateMessage = BaseMessage<"update", NetworkEntityRecord>;
export const composeUpdate = (networkedEntities: NetworkEntityRecord) => ({
  type: "update",
  payload: networkedEntities
})

export type ExitMessage = BaseMessage<"exit", { networkId: NetworkId }>;
export const composeExit = (networkId: NetworkId) => ({
  type: "exit",
  payload: {networkId}
})

export type MessageFromServer = WelcomeMessage | UpdateMessage | ExitMessage;
export type MessagePayloadFromServer = WelcomeMessage["payload"] &
  UpdateMessage["payload"] &
  ExitMessage["payload"];

export type MessageFromClient = UpdateRequestMessage;
export type MessagePayloadFromClient = UpdateRequestMessage["payload"]
