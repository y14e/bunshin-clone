import type { Refs } from '@/ref';

export function cloneBlob(value: Blob, refs: Refs): Blob {
  const { size, type } = value;
  const result = value.slice(0, size, type);
  refs.set(value, result); // [Refs]
  return result;
}
