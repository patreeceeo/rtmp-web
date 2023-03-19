import { Time } from "../state/Time.ts"
import { SystemLoader } from "./mod.ts"

export const TimeSystem: SystemLoader = () => {
  function fixie () {
    Time.tick()
    return []
  }
  return {fixie}
}
