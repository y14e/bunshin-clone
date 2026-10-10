import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions } from '@/types';

type Map_ = Map<unknown, unknown>;

export function cloneMap(
  map: Map_,
  settings: BunshinCloneOptions,
  refs: Refs,
): Map_ {
  const result: Map_ = new Map();
  refs.set(map, result); // [Refs]

  for (const [key, value] of map) {
    result.set(clone(key, settings, refs), clone(value, settings, refs));
  }

  return result;
}
