import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions as Options } from '@/types';
import { isObject } from '@/utils';

type Set_ = Set<unknown>;

type ReadonlySet_ = ReadonlySet<unknown>;

export function cloneSet(
  set: ReadonlySet_,
  settings: Options,
  refs: Refs,
): Set_ {
  // Fast path: primitive Set
  if (isPrimitiveSet(set)) {
    const result = new Set(set);
    refs.set(set, result); // [Refs]
    return result;
  }

  const result: Set_ = new Set();
  refs.set(set, result); // [Refs]

  for (const item of set) {
    result.add(clone(item, settings, refs));
  }

  return result;
}

function isPrimitiveSet(set: ReadonlySet_): boolean {
  for (const value of set) {
    if (isObject(value)) {
      return false;
    }
  }

  return true;
}
