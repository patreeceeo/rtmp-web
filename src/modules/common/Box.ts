export interface IBox {
  xMin: number;
  yMin: number;
  w: number;
  h: number;
  xMax: number;
  yMax: number;
}

function isRangeInfinite(min: number, delta: number) {
  return !Number.isFinite(min) && min < 0 || !Number.isFinite(delta);
}

export class BoxReadOnly implements IBox {
  _xMin: number;
  _yMin: number;
  _w: number;
  _h: number;
  _xIsInfinite = false;
  _yIsInfinite = false;
  constructor(xMin = 0, yMin = 0, w = 0, h = 0) {
    this._xMin = xMin;
    this._yMin = yMin;
    this._w = w;
    this._h = h;
    this._updateInfiniteness();
  }
  _updateInfiniteness() {
    this._xIsInfinite = isRangeInfinite(this._xMin, this._w);
    this._yIsInfinite = isRangeInfinite(this._yMin, this._h);
  }
  get w() {
    return this._w;
  }
  get h() {
    return this._h;
  }
  get xMin() {
    return this._xMin;
  }
  get yMin() {
    return this._yMin;
  }
  _getXMax() {
    if (!this._xIsInfinite) {
      return this.xMin + this.w;
    } else {
      return Infinity;
    }
  }
  get xMax() {
    return this._getXMax();
  }
  _getYMax() {
    if (!this._yIsInfinite) {
      return this.yMin + this.h;
    } else {
      return Infinity;
    }
  }
  get yMax() {
    return this._getYMax();
  }
}

export class Box extends BoxReadOnly implements IBox {
  static ZERO = new BoxReadOnly(0, 0, 0, 0);
  static INFINITY = new BoxReadOnly(-Infinity, -Infinity, Infinity, Infinity);
  constructor(xMin = 0, yMin = 0, w = 0, h = 0) {
    super(xMin, yMin, w, h);
  }
  get xMin() {
    return this._xMin;
  }
  set xMin(xMin: number) {
    this._xMin = xMin;
    this._updateInfiniteness();
  }
  get yMin() {
    return this._yMin;
  }
  set yMin(yMin: number) {
    this._yMin = yMin;
    this._updateInfiniteness();
  }
  get w() {
    return this._w;
  }
  set w(w: number) {
    this._w = w;
    this._updateInfiniteness();
  }
  get h() {
    return this._h;
  }
  set h(h: number) {
    this._h = h;
    this._updateInfiniteness();
  }
  get xMax() {
    return this._getXMax();
  }
  get yMax() {
    return this._getYMax();
  }
  set(xMin: number, yMin: number, w: number, h: number) {
    this._xMin = xMin;
    this._yMin = yMin;
    this._w = w;
    this._h = h;
    this._updateInfiniteness();
    return this;
  }
}
