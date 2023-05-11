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
  stop(): void;
  exec?(context: TContext): void;
}

export class FixedIntervalDriver implements IPipelineDriver {
  #exec?: (context: ISystemExecutionContext) => void;
  #interval?: number;
  constructor(readonly intervalMs: number, readonly leading = false) {}
  start(
    exec: (context: ISystemExecutionContext) => void,
    context: ISystemExecutionContext,
  ) {
    this.#exec = exec;
    const onTick = () => exec(context);
    if (this.leading) {
      onTick();
    }
    this.#interval = setInterval(onTick, this.intervalMs);
  }
  stop() {
    clearInterval(this.#interval);
  }
  exec(context: ISystemExecutionContext) {
    if (this.#exec) {
      this.#exec(context);
    }
  }
}

export class EventQueueDriver implements IPipelineDriver {
  #intervalDriver = new FixedIntervalDriver(0);
  constructor(readonly queue: Array<Event>) {
  }
  start(
    exec: (context: IEventSystemExecutionContext) => void,
    context: IEventSystemExecutionContext,
  ) {
    const onTick = () => exec(context);
    this.#intervalDriver.start(() => {
      let len = this.queue.length;
      while (len--) {
        const event = this.queue.shift()!;
        // console.log("executing", event.type, "code" in event ? event.code : "button" in event ? event.button : event);
        context.event = event;
        onTick();
      }
    }, context);
  }
  stop() {
    this.#intervalDriver.stop();
  }
}

export class AnimationDriver implements IPipelineDriver {
  #isRunning = false;
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
        exec();
        this.#run(exec);
      });
    }
  }
  stop() {
    this.#isRunning = false;
  }
}

export class DemandDriver implements IPipelineDriver {
  #exec?: (context: ISystemExecutionContext) => void;
  constructor() {}
  start(
    exec: (context: ISystemExecutionContext) => void,
    _context: ISystemExecutionContext,
  ) {
    this.#exec = exec;
  }
  exec(context: ISystemExecutionContext) {
    if (this.#exec) {
      this.#exec(context);
    }
  }
  stop() {
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
  exec() {
    if (this.driver.exec) {
      this.driver.exec({
        deltaTime: NaN,
        elapsedTime: 0,
        pauseTime: 0,
      } as unknown as TContext);
    }
  }
}
