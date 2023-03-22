
export interface System {
  // TODO(naming) "fixie"? really?
  fixie?: () => void,
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

export function startPipeline(systems: Array<SystemPartial>, stepMs: number) {
  const fixieSystems = systems.filter((s) => s.fixie)
  setInterval(() => {
    for(const system of fixieSystems) {
      system.fixie!()
    }
  }, stepMs)
}
