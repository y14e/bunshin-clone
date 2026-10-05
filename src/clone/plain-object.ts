import { OWN_ENUM_KEYS } from '@y14e/own';
import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions, PlainObject } from '@/types';

export function clonePlainObject(
  object: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(object));
  refs.set(object, result); // [Refs]

  for (const key of OWN_ENUM_KEYS(object, settings.preserveSymbolKeys)) {
    result[key] = clone(object[key], settings, refs);
  }

  return result;
}
