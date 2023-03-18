import { Time } from "../state/Time.ts"
import { SystemLoader } from "./mod.ts"

export const TimeSystem: SystemLoader = () => {
  function handleFixedStep () {
    Time.tick()
    return []
  }
  return {handleFixedStep}
}
