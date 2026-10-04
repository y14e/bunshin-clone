import { OWN_DESCS, OWN_STRING_KEYS, OWN_SYMBOL_KEYS } from '@y14e/own';
import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions, PlainObject } from '@/types';

export function cloneWithDescriptors(
  object: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(object));
  refs.set(object, result); // [Refs]
  const descs = OWN_DESCS(object);

  function copy(key: string | symbol) {
    const desc = { ...descs[key] };

    if ('value' in desc) {
      desc.value = clone(desc.value, settings, refs);
    }

    try {
      Object.defineProperty(result, key, desc);
    } catch (error) {
      if (settings.strictDescriptors) {
        throw error;
      }
    }
  }

  for (const key of OWN_STRING_KEYS(object)) {
    copy(key);
  }

  if (settings.preserveSymbolKeys) {
    for (const key of OWN_SYMBOL_KEYS(object)) {
      copy(key);
    }
  }

  return result;
}
