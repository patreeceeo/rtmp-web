
export interface Entity {
  x: number,
  y: number
}

export type NetworkId = string
export type NetworkEntityRecord = Record<NetworkId, Entity>

export interface State {
  localPlayer: {
    networkId?: NetworkId
  },
  networkedEntities: NetworkEntityRecord
}

export const createState = (): State => ({
  localPlayer: {
  },
  networkedEntities: {
  }
})
