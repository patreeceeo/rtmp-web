export interface System {
  exec: (context: ISystemExecutionContext) => void;
  create: () => void;
  dispose: () => void;
}
export type SystemPartial = Partial<System>;

export interface ISystemExecutionContext {
  /** time since last execution, in milliseconds */
  deltaTime: number;
  /** time since pipeline started, in milliseconds */
  elapsedTime: number;
}

// deno-lint-ignore no-explicit-any
export interface SystemLoader<TArgs extends Array<any> = []> {
  (...args: TArgs): Promise<SystemPartial> | SystemPartial;
}

interface IPipelineDriver {
  start(exec: () => void): void;
  stop(): void;
}

export class FixedIntervalDriver implements IPipelineDriver {
  #interval?: number;
  constructor(readonly intervalMs: number) {}
  start(exec: () => void) {
    this.#interval = setInterval(exec, this.intervalMs);
  }
  stop() {
    clearInterval(this.#interval);
  }
}

export class AnimationDriver implements IPipelineDriver {
  #isRunning = false;
  constructor() {}
  start(exec: () => void) {
    this.#isRunning = true;
    this.#run(exec);
  }
  #run(exec: () => void) {
    if (this.#isRunning) {
      requestAnimationFrame(() => {
        exec();
        this.#run(exec);
      });
    }
  }
  stop() {
    this.#isRunning = false;
  }
}

export class Pipeline {
  constructor(
    readonly systemPromises: Array<SystemPartial | Promise<SystemPartial>>,
    readonly driver: IPipelineDriver,
  ) {
  }
  async start() {
    const systems = await Promise.all(this.systemPromises);
    const execFns = systems.filter((s) => s.exec).map((s) => s.exec);
    let elapsedTime = 0;
    let deltaTime = NaN;
    let then = performance.now();
    this.driver.start(() => {
      deltaTime = performance.now() - then;
      elapsedTime += deltaTime;
      for (const exec of execFns) {
        exec!({ deltaTime, elapsedTime });
      }
      then = elapsedTime;
    });
  }
  stop() {
    this.driver.stop();
  }
}
