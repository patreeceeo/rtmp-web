export function* filter<T>(
  iter: Iterable<T>,
  test: (t: T) => boolean,
): Generator<T> {
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
  const transform = typeof fnOrProperty === "string"
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

export function toArray<T>(iter: Iterable<T>, arr = [] as Array<T>) {
  for (const el of iter) {
    arr.push(el);
  }
  return arr;
}
