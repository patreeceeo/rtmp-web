export function* filter<T>(
  iter: Iterable<T>,
  test: (t: T) => boolean,
): Iterable<T> {
  for (const el of iter) {
    if (test(el)) {
      yield el;
    }
  }
}

export function* map<A, B>(
  iter: Iterable<A>,
  fnOrProperty: ((a: A) => B) | keyof A,
): Generator<B> {
  const transform = typeof fnOrProperty !== "function"
    ? (el: A) => el[fnOrProperty] as B
    : fnOrProperty as ((a: A) => B);
  for (const el of iter) {
    yield transform(el);
  }
}

export function forEach<T>(iter: Iterable<T>, fn: (t: T) => void) {
  for (const el of iter) {
    fn(el);
  }
}

/** @deprecated except for debugging/testing */
export function toArray<T>(iter: Iterable<T>, arr = [] as Array<T>) {
  for (const el of iter) {
    arr.push(el);
  }
  return arr;
}

export function* flatten<A, B>(
  iter: Iterable<A>,
  fn: (a: A) => Iterable<B>,
): Iterable<B> {
  for (const el of iter) {
    for (const subEl of fn(el)) {
      yield subEl;
    }
  }
}

export function join<T>(...iterables: Array<Iterable<T>>): Iterable<T> {
  return {
    *[Symbol.iterator]() {
      for (const iter of iterables) {
        yield* iter;
      }
    },
  };
}

export function average(iter: Iterable<number>, maxItems = Infinity) {
  let sum = 0;
  let count = 0;
  for (const el of iter) {
    sum += el;
    count++;
    if (count >= maxItems) {
      break;
    }
  }
  return sum / count;
}

/*
// Used in an attempt at keeping the client and server simulations more in sync using rollback. See examples/platformer/common/traits.ts
export function zip<T>(iterables: Array<Iterable<T>>, targetTuple: Array<T> = []): Iterable<Array<T>> {
  return {
    *[Symbol.iterator]() {
      const iterators = iterables.map((iter) => iter[Symbol.iterator]());
      while (true) {
        const nexts = iterators.map((iter) => iter.next());
        if (nexts.every((next) => next.done)) {
          break;
        }
        targetTuple.length = 0;
        for (const next of nexts) {
          targetTuple.push(next.value);
        }
        yield targetTuple;
      }
    },
  };
}

export function *tail<T>(iter: Iterable<T>, headLenght = 1): Iterable<T> {
  let count = 0
  for (const el of iter) {
    if (count >= headLenght) {
      yield el;
    }
    count++;
  }
}
*/

export const emtpyIterable = (new Set()).values();
