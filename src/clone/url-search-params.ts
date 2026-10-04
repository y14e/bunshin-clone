import type { Refs } from '@/ref';

export function cloneURLSearchParams(
  value: URLSearchParams,
  refs: Refs,
): URLSearchParams {
  const result = new URLSearchParams(value);
  refs.set(value, result); // [Refs]
  return result;
}
