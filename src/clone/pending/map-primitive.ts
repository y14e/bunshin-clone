import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions as Options } from '@/types';
import { isObject } from '@/utils';

type Map_ = Map<unknown, unknown>;

export function cloneMap(map: Map_, settings: Options, refs: Refs): Map_ {
  // Fast path: primitive Map
  if (isPrimitiveMap(map)) {
    const result = new Map(map);
    refs.set(map, result); // [Refs]
    return result;
  }

  const result: Map_ = new Map();
  refs.set(map, result); // [Refs]

  for (const [key, value] of map) {
    result.set(clone(key, settings, refs), clone(value, settings, refs));
  }

  return result;
}

function isPrimitiveMap(map: Map_): boolean {
  for (const [key, value] of map) {
    if (isObject(key) || isObject(value)) {
      return false;
    }
  }

  return true;
}
