import type { Refs } from '@/ref';

export function cloneURL(value: URL, refs: Refs): URL {
  const result = new URL(value.href);
  refs.set(value, result); // [Refs]
  return result;
}
