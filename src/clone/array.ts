import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions } from '@/types';
import { isObject } from '@/utils';

export function cloneArray(
  array: unknown[],
  settings: BunshinCloneOptions,
  refs: Refs,
): unknown[] {
  const result = isPrimitiveArray(array)
    ? array.slice() // Fast path: primitive array
    : array.map((i) => clone(i, settings, refs));
  refs.set(array, result); // [Refs]
  return result;
}

export function isPrimitiveArray(array: unknown[]): boolean {
  return array.every((i) => !isObject(i));
}
