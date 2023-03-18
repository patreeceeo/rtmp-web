
class TimeApi {
  #state = {
    delta: 0,
    elapsed: 0,
    then: 0
  }
  tick() {
    const now = performance.now()
    const delta = now - this.#state.then
    this.#state.delta = delta
    this.#state.elapsed += delta
    this.#state.then = now
  }

  get delta () {
    return this.#state.delta
  }

  get elapsed () {
    return this.#state.elapsed
  }
}

export const Time = new TimeApi()
