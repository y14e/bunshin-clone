import type { Refs } from '@/ref';

export function cloneBlob(blob: Blob, refs: Refs): Blob {
  const { size, type } = blob;
  const result = blob.slice(0, size, type);
  refs.set(blob, result); // [Refs]
  return result;
}
