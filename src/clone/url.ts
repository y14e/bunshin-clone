import type { Refs } from '@/ref';

export function cloneURL(url: URL, refs: Refs): URL {
  const result = new URL(url.href);
  refs.set(url, result); // [Refs]
  return result;
}
