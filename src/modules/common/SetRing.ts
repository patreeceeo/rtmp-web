import { filter } from "./Iterable.ts";

class SetRingItem {
  set: Set<number> = new Set();
  constructor(public key: number) {}
}

/**
 * An abstract data structure with the following properties:
 * - maps a number key to a set of number values
 * - allows no more than X keys at any time, and if there are X keys, then any newly added key pushes out the least-recently added key and its values
 * - allows the values to be within the range L - Y to Y, where L is the largest value and Y is a controlled variable. If a value larger than L is added, then that becomes the new value of L and any values outside the range are discarded.
 */
export class SetRing {
  #map: Array<SetRingItem>;
  #largestValue = 0;
  #smallestKey = Infinity;
  constructor(
    readonly maxKeys: number,
    readonly maxValueDiff: number,
    readonly debug = false,
  ) {
    this.#map = Array.from(new Array(maxKeys), () => new SetRingItem(0));
  }
  #mapKey(key: number) {
    return key >= 0 ? key % this.maxKeys : this.maxKeys + (key % this.maxKeys);
  }
  add(key: number, value: number) {
    // TODO if the struct at the mapped key's key doesn't equal key then clear its set and update its key
    const mapKey = this.#mapKey(key);
    const item = this.#map[mapKey];
    if (!item) {
      throw new Error(`item at key ${key} (mapKey ${mapKey}) is undefined`);
    }
    if (item.key !== key) {
      item.set.clear();
      item.key = key;
    }
    item.set.add(value);
    if (value > this.#largestValue) {
      this.#largestValue = value;
      this.#trimValues();
    }
    if (this.debug) {
      console.log("added", { key, value, set: item.set });
    }
  }
  has(key: number) {
    const item = this.#map[this.#mapKey(key)];
    // console.log("has?", key, "# of values", set.size, "smallest key", this.#smallestKey, "maxKey", this.#smallestKey + this.maxKeys)
    if (
      item.key === key
    ) {
      // this.debug && console.log("has", key)
      return true;
    } else {
      this.debug &&
        console.log(
          "not a key:",
          key,
          "# of values",
          item.set.size,
          "smallest key",
          this.#smallestKey,
          "maxKey",
          this.#smallestKey + this.maxKeys,
        );
      return false;
    }
  }
  *keys() {
    for (const item of this.#map) {
      yield item.key;
    }
  }
  values(key: number) {
    return this.#map[this.#mapKey(key)].set.values();
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
  #trimValues() {
    for (const item of this.#map) {
      const valuesToDiscard = filter(
        item.set.values(),
        (value) => this.#largestValue - value > this.maxValueDiff,
      );
      for (const offset of valuesToDiscard) {
        item.set.delete(offset);
      }
    }
  }
}
