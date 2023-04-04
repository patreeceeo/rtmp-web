export interface System {
  exec: () => void;
  create: () => void;
  dispose: () => void;
}
export type SystemPartial = Partial<System>;

export interface SystemLoader<
  Options = Record<string | number | symbol, never>,
> {
  (opts?: Partial<Options>): Promise<SystemPartial> | SystemPartial;
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
