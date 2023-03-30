// from https://github.com/Electroid/bytebuf
// TODO adapt unit tests
export { DataViewMovable };

const tempBuf = new ArrayBuffer(8);
const tempView = new DataView(tempBuf);

interface DataViewMovableOptions {
  isCircular?: boolean;
}
/**
 * A movable (and optionally circular) data view.
 *
 * Supports the following data types:
 * - Bool
 * - Int (8, 16, 32, 64)
 * - Uint (8, 16, 32, 64)
 * - Float (32, 64)
 *
 * @extends DataView
 */
class DataViewMovable extends DataView {
  isCircular = false;
  constructor(source: ArrayBuffer, options: DataViewMovableOptions = {}) {
    super(source);
    if (options.isCircular) {
      this.isCircular = true;
    }
  }
  /**
   * The byte offset.
   */
  #byteOffset: number = super.byteOffset;

  #maybeCircularGet(
    fieldLength: number,
    getter: (byteOffset: number, littleEndian?: boolean) => number,
    fieldOffset: number,
    littleEndian?: boolean,
  ) {
    const circularOffset = fieldOffset % this.byteLength;
    if (this.isCircular && this.byteLength - circularOffset < fieldLength) {
      for (let writeIndex = 0; writeIndex < fieldLength; writeIndex++) {
        const readIndex = (writeIndex + fieldOffset) % this.byteLength;
        tempView.setInt8(writeIndex, super.getInt8(readIndex));
      }
      return getter.call(tempView, 0, littleEndian);
    } else {
      return getter.call(this, circularOffset, littleEndian);
    }
  }

  #maybeCircularSet(
    fieldLength: number,
    setter: (byteOffset: number, value: number, littleEndian?: boolean) => void,
    fieldOffset: number,
    value: number,
    littleEndian?: boolean,
  ) {
    const circularOffset = fieldOffset % this.byteLength;
    if (this.isCircular && this.byteLength - circularOffset < fieldLength) {
      setter.call(tempView, 0, value, littleEndian);
      for (let readIndex = 0; readIndex < fieldLength; readIndex++) {
        const writeIndex = (readIndex + fieldOffset) % this.byteLength;
        super.setInt8(writeIndex, tempView.getInt8(readIndex));
      }
    } else {
      setter.call(this, circularOffset, value, littleEndian);
    }
  }

  /**
   * The byte offset.
   * @returns The byte offset.
   */
  get byteOffset(): number {
    return this.#byteOffset;
  }

  /**
   * The number of remaining bytes.
   * @returns The number of bytes remaining.
   */
  get bytesRemaining(): number {
    return this.isCircular ? Infinity : this.byteLength - this.#byteOffset;
  }

  /**
   * Skips the byte offset.
   * @param byteLength The byte length.
   */
  skip(byteLength: number): void {
    this.#byteOffset += byteLength;
  }

  /**
   * Resets the byte offset.
   */
  reset(): void {
    this.#byteOffset = super.byteOffset;
  }

  /**
   * Clears the byte buffer.
   */
  clear(): void {
    new Uint8Array(this.buffer).fill(0);
  }

  /**
   * Gets a boolean.
   * @param byteOffset The byte offset.
   */
  getBool(byteOffset: number): boolean {
    return this.getInt8(byteOffset) !== 0;
  }

  /**
   * Reads the next boolean.
   */
  readBool(): boolean {
    return this.getInt8(this.#byteOffset++) !== 0;
  }

  /**
   * Sets a boolean.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setBool(byteOffset: number, value: boolean): void {
    super.setInt8(byteOffset, value ? 1 : 0);
  }

  /**
   * Writes the next boolean.
   * @param value The value.
   */
  writeBool(value: boolean): void {
    this.setInt8(this.#byteOffset++, value ? 1 : 0);
  }

  /**
   * Gets an signed byte.
   * @param byteOffset The byte offset.
   * @returns The value.
   */
  getInt8(byteOffset: number): number {
    return super.getInt8(
      this.isCircular ? byteOffset % this.byteLength : byteOffset,
    );
  }

  /**
   * Reads the next signed byte.
   * @returns The value.
   */
  readInt8(): number {
    return this.getInt8(this.#byteOffset++);
  }

  /**
   * Sets a signed byte.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setInt8(byteOffset: number, value: number): void {
    super.setInt8(
      this.isCircular ? byteOffset % this.byteLength : byteOffset,
      value,
    );
  }

  /**
   * Writes the next signed byte.
   * @param value The value.
   */
  writeInt8(value: number): void {
    this.setInt8(this.#byteOffset++, value);
  }

  /**
   * Gets an unsigned byte.
   * @param byteOffset The byte offset.
   * @returns The value.
   */
  getUint8(byteOffset: number): number {
    return super.getUint8(byteOffset % this.byteLength);
  }

  /**
   * Reads the next unsigned byte.
   * @returns The value.
   */
  readUint8(): number {
    return this.getUint8(this.#byteOffset++);
  }

  /**
   * Sets an unsigned byte.
   * @param byteOffset The byte offset.
   * @param value The value.
   */
  setUint8(byteOffset: number, value: number): void {
    super.setUint8(byteOffset % this.byteLength, value);
  }

  /**
   * Writes the next signed byte.
   * @param value The value.
   */
  writeUint8(value: number): void {
    this.setUint8(this.#byteOffset++, value);
  }

  /**
   * Gets an signed short.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getInt16(byteOffset: number, littleEndian?: boolean): number {
    return this.#maybeCircularGet(2, super.getInt16, byteOffset, littleEndian);
  }

  /**
   * Reads the next signed short.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readInt16(littleEndian?: boolean): number {
    const value = this.getInt16(this.#byteOffset, littleEndian);
    this.#byteOffset += 2;
    return value;
  }

  /**
   * Sets a signed short.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setInt16(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.#maybeCircularSet(2, super.setInt16, byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed short.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeInt16(value: number, littleEndian?: boolean): void {
    this.setInt16(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 2;
  }

  /**
   * Gets an unsigned short.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getUint16(byteOffset: number, littleEndian?: boolean): number {
    return this.#maybeCircularGet(2, super.getUint16, byteOffset, littleEndian);
  }

  /**
   * Reads the next unsigned short.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readUint16(littleEndian?: boolean): number {
    const value = this.getUint16(this.#byteOffset, littleEndian);
    this.#byteOffset += 2;
    return value;
  }

  /**
   * Sets an unsigned short.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setUint16(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.#maybeCircularSet(2, super.setUint16, byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed short.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeUint16(value: number, littleEndian?: boolean): void {
    this.setUint16(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 2;
  }

  /**
   * Gets an signed integer.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getInt32(byteOffset: number, littleEndian?: boolean): number {
    return this.#maybeCircularGet(4, super.getInt32, byteOffset, littleEndian);
  }

  /**
   * Reads the next signed integer.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readInt32(littleEndian?: boolean): number {
    const value = this.getInt32(this.#byteOffset, littleEndian);
    this.#byteOffset += 4;
    return value;
  }

  /**
   * Sets a signed integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setInt32(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.#maybeCircularSet(4, super.setInt32, byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed integer.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeInt32(value: number, littleEndian?: boolean): void {
    this.setInt32(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets an unsigned integer.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getUint32(byteOffset: number, littleEndian?: boolean): number {
    return this.#maybeCircularGet(4, super.getUint32, byteOffset, littleEndian);
  }

  /**
   * Reads the next unsigned integer.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readUint32(littleEndian?: boolean): number {
    const value = this.getUint32(this.#byteOffset, littleEndian);
    this.#byteOffset += 4;
    return value;
  }

  /**
   * Sets an unsigned integer.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setUint32(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.#maybeCircularSet(4, super.setUint32, byteOffset, value, littleEndian);
  }

  /**
   * Writes the next signed integer.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeUint32(value: number, littleEndian?: boolean): void {
    this.setUint32(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets a float.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getFloat32(byteOffset: number, littleEndian?: boolean): number {
    return this.#maybeCircularGet(
      4,
      super.getFloat32,
      byteOffset,
      littleEndian,
    );
  }

  /**
   * Reads the next float.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readFloat32(littleEndian?: boolean): number {
    const value = this.getFloat32(this.#byteOffset, littleEndian);
    this.#byteOffset += 4;
    return value;
  }

  /**
   * Sets a float.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setFloat32(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.#maybeCircularSet(
      4,
      super.setFloat32,
      byteOffset,
      value,
      littleEndian,
    );
  }

  /**
   * Writes the next float.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeFloat32(value: number, littleEndian?: boolean): void {
    this.setFloat32(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 4;
  }

  /**
   * Gets a double.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getFloat64(byteOffset: number, littleEndian?: boolean): number {
    return this.#maybeCircularGet(
      8,
      super.getFloat64,
      byteOffset,
      littleEndian,
    );
  }

  /**
   * Reads the next double.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readFloat64(littleEndian?: boolean): number {
    const value = this.getFloat64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets a double.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setFloat64(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.#maybeCircularSet(
      8,
      super.setFloat64,
      byteOffset,
      value,
      littleEndian,
    );
  }

  /**
   * Writes the next double.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeFloat64(value: number, littleEndian?: boolean): void {
    this.setFloat64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets an signed long.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getBigInt64(byteOffset: number, littleEndian?: boolean): bigint {
    if (this.isCircular) throw new Error("Not implemented");
    return super.getBigInt64(byteOffset % this.byteLength, littleEndian);
  }

  /**
   * Reads the next signed long.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readBigInt64(littleEndian?: boolean): bigint {
    const value = this.getBigInt64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets a signed long.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setBigInt64(byteOffset: number, value: bigint, littleEndian?: boolean): void {
    if (this.isCircular) throw new Error("Not implemented");
    super.setBigInt64(byteOffset % this.byteLength, value, littleEndian);
  }

  /**
   * Writes the next signed long.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  writeBigInt64(value: bigint, littleEndian?: boolean): void {
    this.setBigInt64(this.#byteOffset, value, littleEndian);
    this.#byteOffset += 8;
  }

  /**
   * Gets an unsigned long.
   * @param byteOffset The byte offset.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  getBigUint64(byteOffset: number, littleEndian?: boolean): bigint {
    if (this.isCircular) throw new Error("Not implemented");
    return super.getBigUint64(byteOffset % this.byteLength, littleEndian);
  }

  /**
   * Reads the next unsigned long.
   * @param littleEndian If the value is little endian.
   * @returns The value.
   */
  readBigUint64(littleEndian?: boolean): bigint {
    const value = this.getBigUint64(this.#byteOffset, littleEndian);
    this.#byteOffset += 8;
    return value;
  }

  /**
   * Sets an unsigned long.
   * @param byteOffset The byte offset.
   * @param value The value.
   * @param littleEndian If the value is little endian.
   */
  setBigUint64(
    byteOffset: number,
    value: bigint,
    littleEndian?: boolean,
  ): void {
    if (this.isCircular) throw new Error("Not implemented");
    super.setBigUint64(byteOffset % this.byteLength, value, littleEndian);
  }
}
