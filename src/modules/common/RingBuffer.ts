
export class RingBuffer<ReadItem, WriteItem extends ReadItem> {
  #buffer: Array<ReadItem>
  #readIndex = 0
  #writeIndex = 0

  constructor(getItem: () => ReadItem, length: number) {
    this.#buffer = Array.from({length}, getItem)
  }

  get(): ReadItem {
    const item = this.peek()
    this.#readIndex++
    return item
  }

  peek(): ReadItem {
    return this.#buffer[this.#readIndex % this.#buffer.length]
  }

  put(): WriteItem {
    const item = this.#buffer[this.#writeIndex % this.#buffer.length]
    this.#writeIndex++
    return item as WriteItem
  }

  *values(from: number, to: number): IterableIterator<ReadItem> {
    let index = from
    while(index < to) {
      yield this.#buffer[index % this.#buffer.length]
      index++
    }

  }

  get readIndex () {
    return this.#readIndex
  }
  set readIndex (i: number) {
    this.#readIndex = i
  }
  get writeIndex () {
    return this.#writeIndex
  }
  set writeIndex (i: number) {
    this.#writeIndex = i
  }
}
