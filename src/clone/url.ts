import type { Refs } from '../ref';

export function cloneUrl(url: URL, refs: Refs): URL {
  const result = new URL(url.href);
  refs.set(url, result); // [Refs]
  return result;
}
