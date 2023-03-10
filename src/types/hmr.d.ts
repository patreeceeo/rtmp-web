import { HotModuleState } from '../modules/dev_client/mod.ts'
declare global {
  interface ImportMeta {
    hot?: HotModuleState
  }
}
