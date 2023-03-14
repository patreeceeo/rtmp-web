export interface Entity {
  x: number;
  y: number;
}

export type NetworkId = string;
export type NetworkEntityRecord = Record<NetworkId, Entity>;

export interface InputState {
  pressTime: number;
  releaseTime: number;
}

export interface State {
  localPlayer: {
    networkId?: NetworkId;
    input: Record<string, InputState>;
  };
  networkedEntities: NetworkEntityRecord;
  ws?: WebSocket;
  loaded: boolean;
}

const createState = (): State => ({
  localPlayer: {
    input: {},
  },
  networkedEntities: {},
  loaded: false,
});

export const state = createState();
