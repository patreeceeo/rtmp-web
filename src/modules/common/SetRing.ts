import { filter } from "./Iterable.ts";

/**
 * An abstract data structure with the following properties:
 * - maps a number key to a set of number values
 * - allows no more than X keys at any time, and if there are X keys, then any newly added key pushes out the least-recenlty added key and its values
 * - allows the values to be within the range L - Y to Y, where L is the largest value and Y is a controlled variable. If a value larger than L is added, then that becomes the new value of L and any values outside the range are discarded.
 */
export class SetRing {
  #map: Array<Set<number>>;
  #knownKeys: Array<number> = [];
  #largestValue = 0;
  #smallestKey = Infinity;
  constructor(
    readonly maxKeys: number,
    readonly maxValueDiff: number,
    readonly debug = false,
  ) {
    this.#map = Array.from(new Array(maxKeys), () => new Set());
  }
  #mapKey(key: number) {
    return key >= 0 ? key % this.maxKeys : this.maxKeys + (key % this.maxKeys);
  }
  add(key: number, value: number) {
    const mapKey = this.#mapKey(key);
    if (mapKey in this.#knownKeys && this.#knownKeys[mapKey] !== key) {
      this.#trimKeysFor(key);
    }
    this.#knownKeys[mapKey] = key;
    const set = this.#map[mapKey]!;
    set.add(value);
    if (value > this.#largestValue) {
      this.#largestValue = value;
      this.#trimValues();
    }
    // TODO(regression test) there was a bug relating to this value only being updated in #trimKeysFor
    this.#smallestKey = Math.min(this.#smallestKey, key);
    if (this.debug) {
      console.log("added", { key, value, set });
    }
  }
  has(key: number) {
    const set = this.#map[this.#mapKey(key)];
    // console.log("has?", key, "# of values", set.size, "smallest key", this.#smallestKey, "maxKey", this.#smallestKey + this.maxKeys)
    if (
      set.size > 0 && key >= this.#smallestKey &&
      key < this.#smallestKey + this.maxKeys
    ) {
      // this.debug && console.log("has", key)
      return true;
    } else {
      // this.debug && console.log("no has", key, "# of values", set.size, "smallest key", this.#smallestKey, "maxKey", this.#smallestKey + this.maxKeys)
      return false;
    }
  }
  *keys() {
    for (const mapKey of this.#map.keys()) {
      yield mapKey + this.#smallestKey;
    }
  }
  values(key: number) {
    return this.#map[this.#mapKey(key)]!.values();
  }
  *sliceValues(
    startKey: number,
    endKey: number,
  ): Generator<number> {
    let key = startKey;
    while (key <= endKey) {
      if (this.has(key)) {
        this.debug &&
          console.log(
            "slice from",
            startKey,
            "to",
            endKey,
            "includes key",
            key,
          );
        for (const value of this.values(key)) {
          this.debug && console.log("yeilding value", value);
          yield value;
        }
      }
      key++;
    }
  }
  #trimKeysFor(key: number) {
    this.#smallestKey = key - this.maxKeys + 1;
    this.#map[this.#mapKey(key)].clear();
  }
  #trimValues() {
    for (const set of this.#map) {
      const valuesToDiscard = filter(
        set.values(),
        (value) => this.#largestValue - value > this.maxValueDiff,
      );
      for (const offset of valuesToDiscard) {
        set.delete(offset);
      }
    }
  }
}
