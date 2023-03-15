
export class Vec2 {
  constructor(public x = 0, public y = 0) {}
  __copy__(src: Vec2) {
    this.x = src.x
    this.y = src.y
  }
}
