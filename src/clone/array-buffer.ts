import type { Refs } from '@/ref';

export function cloneArrayBuffer(buffer: ArrayBuffer, refs: Refs): ArrayBuffer {
  const result = buffer.slice(0);
  refs.set(buffer, result); // [Refs]
  return result;
}
