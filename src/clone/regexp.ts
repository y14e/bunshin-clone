import type { Refs } from '@/ref';

export function cloneRegExp(re: RegExp, refs: Refs): RegExp {
  const { source, flags, lastIndex } = re;
  const result = new RegExp(source, flags);
  refs.set(re, result); // [Refs]
  result.lastIndex = lastIndex;
  return result;
}
