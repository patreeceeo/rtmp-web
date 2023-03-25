
export interface System {
  exec?: () => void,
  events?: Partial<SystemEvents>
}
export type SystemPartial = Partial<System>

// TODO merge with system interface
interface SystemEvents {
  create: () => void
  dispose: () => void
}

export interface SystemLoader<Options = Record<string | number | symbol, never>> {
  (opts?: Partial<Options>): Promise<SystemPartial> | SystemPartial
}

// TODO write a Pipeline class (or copy it from dreamt)
export function startPipeline(systems: Array<SystemPartial>, stepMs: number) {
  const execSystems = systems.filter((s) => s.exec)
  setInterval(() => {
    for(const system of execSystems) {
      system.exec!()
    }
  }, stepMs)
}
