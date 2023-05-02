export interface System<
  TContext extends ISystemExecutionContext = ISystemExecutionContext,
> {
  exec: (context: TContext) => void;
  create: () => void;
  dispose: () => void;
}
export type SystemPartial<
  TContext extends ISystemExecutionContext = ISystemExecutionContext,
> = Partial<System<TContext>>;

export interface ISystemExecutionContext {
  /** time since last execution, in milliseconds */
  deltaTime: number;
  /** time since pipeline started, in milliseconds */
  elapsedTime: number;
  pauseTime: number;
}

export interface IEventSystemExecutionContext extends ISystemExecutionContext {
  event: Event;
}

// deno-lint-ignore no-explicit-any
export interface SystemLoader<
  TContext extends ISystemExecutionContext = ISystemExecutionContext,
  TArgs extends Array<any> = [],
> {
  (...args: TArgs): Promise<SystemPartial<TContext>> | SystemPartial<TContext>;
}

interface IPipelineDriver<
  TContext extends ISystemExecutionContext = ISystemExecutionContext,
> {
  start(exec: (context: TContext) => void, context: TContext): void;
  onTick: () => void;
  stop(): void;
}

export class FixedIntervalDriver implements IPipelineDriver {
  #interval?: number;
  onTick = () => {};
  constructor(readonly intervalMs: number) {}
  start(
    exec: (context: ISystemExecutionContext) => void,
    context: ISystemExecutionContext,
  ) {
    const onTick = () => {
      this.onTick(), exec(context);
    };
    this.#interval = setInterval(onTick, this.intervalMs);
  }
  stop() {
    clearInterval(this.#interval);
  }
}

export class EventQueueDriver implements IPipelineDriver {
  onTick = () => {};
  #intervalDriver = new FixedIntervalDriver(0);
  constructor(readonly queue: Array<Event>) {
  }
  start(
    exec: (context: IEventSystemExecutionContext) => void,
    context: IEventSystemExecutionContext,
  ) {
    const boundExec = () => exec(context);
    this.#intervalDriver.start(() => {
      let len = this.queue.length;
      while (len--) {
        const event = this.queue.shift()!;
        context.event = event;
        boundExec();
      }
    }, context);
  }
  stop() {
    this.#intervalDriver.stop();
  }
}

export class AnimationDriver implements IPipelineDriver {
  #isRunning = false;
  onTick = () => {};
  constructor() {}
  start(
    exec: (context: ISystemExecutionContext) => void,
    context: ISystemExecutionContext,
  ) {
    const boundExec = () => exec(context);
    this.#isRunning = true;
    this.#run(boundExec);
  }
  #run(exec: () => void) {
    if (this.#isRunning) {
      requestAnimationFrame(() => {
        this.onTick();
        exec();
        this.#run(exec);
      });
    }
  }
  stop() {
    this.#isRunning = false;
  }
}

export class Pipeline<
  TContext extends ISystemExecutionContext = ISystemExecutionContext,
> {
  #interval?: number;
  constructor(
    readonly systemPromises: Array<
      SystemPartial<TContext> | Promise<SystemPartial<TContext>>
    >,
    readonly driver: IPipelineDriver<TContext>,
  ) {}
  async start() {
    const systems = await Promise.all(this.systemPromises);
    const execFns = systems.filter((s) => s.exec).map((s) => s.exec);
    let then = performance.now();
    let elapsedRealTime = 0;
    const context = {
      deltaTime: NaN,
      elapsedTime: 0,
      pauseTime: 0,
    } as unknown as TContext;

    this.driver.start((context) => {
      tick();
      for (const exec of execFns) {
        exec!(context);
      }
    }, context);

    function tick() {
      context.deltaTime = performance.now() - then;
      elapsedRealTime += context.deltaTime;
      if (context.pauseTime > 0) {
        context.pauseTime -= context.deltaTime;
      } else {
        context.pauseTime = 0;
        context.elapsedTime += context.deltaTime;
      }
      then = elapsedRealTime;
    }
  }
  stop() {
    this.driver.stop();
    clearInterval(this.#interval);
  }
}
