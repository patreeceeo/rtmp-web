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
}

export const createState = (): State => ({
  localPlayer: {
    input: {},
  },
  networkedEntities: {},
});
