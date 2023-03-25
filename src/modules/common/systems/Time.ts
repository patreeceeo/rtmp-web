import { Time } from "../state/Time.ts"
import { SystemLoader } from "./mod.ts"

export const TimeSystem: SystemLoader = () => {
  function exec () {
    Time.tick()
  }
  return {exec}
}
