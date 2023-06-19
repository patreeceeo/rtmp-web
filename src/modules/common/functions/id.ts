const _idMap: { [key: string]: number } = {};

export function incrementId(key: string) {
  const id = _idMap[key] || 0;
  _idMap[key] = id + 1;
  return id;
}
