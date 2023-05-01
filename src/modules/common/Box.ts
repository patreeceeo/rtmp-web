export interface IBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Box implements IBox {
  constructor(public x = 0, public y = 0, public w = 0, public h = 0) {}
}

export class BoxReadOnly implements IBox {
  constructor(readonly x = 0, readonly y = 0, readonly w = 0, readonly h = 0) {}
}
