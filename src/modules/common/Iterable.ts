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
  transform: (a: A) => B,
): Generator<B> {
  for (const el of iter) {
    yield transform(el);
  }
}

export function forEach<T>(iter: Iterable<T>, fn: (t: T) => void) {
  for (const el of iter) {
    fn(el);
  }
}
