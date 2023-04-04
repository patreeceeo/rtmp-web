export interface System {
  exec: () => void;
  create: () => void;
  dispose: () => void;
}
export type SystemPartial = Partial<System>;

// deno-lint-ignore no-explicit-any
export interface SystemLoader<TArgs extends Array<any> = []> {
  (...args: TArgs): Promise<SystemPartial> | SystemPartial;
}

export class Pipeline {
  #execFns: Array<SystemPartial["exec"]>;
  #execInterval?: number;
  constructor(systems: Array<SystemPartial>) {
    this.#execFns = systems.filter((s) => s.exec).map((s) => s.exec);
  }
  start(intervalMs: number) {
    this.#execInterval = setInterval(() => {
      for (const exec of this.#execFns) {
        exec!();
      }
    }, intervalMs);
  }
  stop() {
    clearInterval(this.#execInterval);
  }
}
