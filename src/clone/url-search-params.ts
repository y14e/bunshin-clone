import type { Refs } from '@/ref';

export function cloneURLSearchParams(
  params: URLSearchParams,
  refs: Refs,
): URLSearchParams {
  const result = new URLSearchParams(params);
  refs.set(params, result); // [Refs]
  return result;
}
