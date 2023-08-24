// deno-lint-ignore no-explicit-any
export class Pool<T, FactoryArgs extends ReadonlyArray<any>> {
  #items: T[] = [];
  #size = 0;

  constructor(
    readonly factory: (...args: FactoryArgs) => T,
    readonly identify: (t: T) => number,
  ) {
    this.#size = 0;
  }
  get size() {
    return this.#size;
  }
  acquire(...args: FactoryArgs): T {
    const instance = this.factory(...args);
    this.#items[this.identify(instance)] = instance;
    this.#size++;
    return instance;
  }
  get(id: number): T | undefined {
    return this.#items[id];
  }
  set(instance: T) {
    const id = this.identify(instance);
    const wasDefined = id in this.#items;
    this.#items[id] = instance;
    if (!wasDefined) {
      this.#size++;
    }
  }
  release(id: number) {
    if (id in this.#items) {
      delete this.#items[id];
      this.#size--;
    }
  }
}
