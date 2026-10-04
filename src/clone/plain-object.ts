import { clone } from '@/index';
import { OWN_ENUM_STRING_KEYS, OWN_ENUM_SYMBOL_KEYS } from '@/own';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions, PlainObject } from '@/types';

export function clonePlainObject(
  object: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(object));
  refs.set(object, result); // [Refs]

  for (const key of OWN_ENUM_STRING_KEYS(object)) {
    result[key] = clone(object[key], settings, refs);
  }

  if (settings.preserveSymbolKeys) {
    for (const key of OWN_ENUM_SYMBOL_KEYS(object)) {
      result[key] = clone(object[key], settings, refs);
    }
  }

  return result;
}
