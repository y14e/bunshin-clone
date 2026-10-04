import { OWN_ENUM_STRING_KEYS, OWN_ENUM_SYMBOL_KEYS } from '@y14e/own';
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

  function copy(key: string | symbol) {
    result[key] = clone(object[key], settings, refs);
  }

  for (const key of OWN_ENUM_STRING_KEYS(object)) {
    copy(key);
  }

  if (settings.preserveSymbolKeys) {
    for (const key of OWN_ENUM_SYMBOL_KEYS(object)) {
      copy(key);
    }
  }

  return result;
}
