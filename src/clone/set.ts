import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions } from '@/types';
import { isObject } from '@/utils';

export function cloneSet(
  set: Set<unknown>,
  settings: BunshinCloneOptions,
  refs: Refs,
): Set<unknown> {
  // Fast path: primitive Set
  if (isPrimitiveSet(set)) {
    const result = new Set(set);
    refs.set(set, result); // [Refs]
    return result;
  }

  const result = new Set<unknown>();
  refs.set(set, result); // [Refs]

  for (const item of set) {
    result.add(clone(item, settings, refs));
  }

  return result;
}

export function isPrimitiveSet(set: Set<unknown>): boolean {
  for (const value of set) {
    if (isObject(value)) {
      return false;
    }
  }

  return true;
}
