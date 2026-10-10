import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { Options } from '@/types';
import { isObject } from '@/utils';

type Array_ = unknown[];

export function cloneArray(
  array: Array_,
  settings: Options,
  refs: Refs,
): Array_ {
  const result = isPrimitiveArray(array)
    ? array.slice() // Fast path: primitive array
    : array.map((i) => clone(i, settings, refs));
  refs.set(array, result); // [Refs]
  return result;
}

export function isPrimitiveArray(array: Array_): boolean {
  return array.every((i) => !isObject(i));
}
