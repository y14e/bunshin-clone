import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions } from '@/types';

export function cloneMap(
  map: Map<unknown, unknown>,
  settings: BunshinCloneOptions,
  refs: Refs,
): Map<unknown, unknown> {
  const result = new Map<unknown, unknown>();
  refs.set(map, result); // [Refs]

  for (const [key, value] of map) {
    result.set(clone(key, settings, refs), clone(value, settings, refs));
  }

  return result;
}
