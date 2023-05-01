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
  pauseTime: number;
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
  ) {}
  async start() {
    const systems = await Promise.all(this.systemPromises);
    const execFns = systems.filter((s) => s.exec).map((s) => s.exec);
    let then = performance.now();
    let elapsedRealTime = 0;
    const context: ISystemExecutionContext = {
      deltaTime: NaN,
      elapsedTime: 0,
      pauseTime: 0,
    };
    this.driver.start(() => {
      context.deltaTime = performance.now() - then;
      elapsedRealTime += context.deltaTime;
      if (context.pauseTime > 0) {
        context.pauseTime -= context.deltaTime;
      } else {
        context.pauseTime = 0;
        context.elapsedTime += context.deltaTime;
        for (const exec of execFns) {
          exec!(context);
        }
      }
      then = elapsedRealTime;
    });
  }
  stop() {
    this.driver.stop();
  }
}
