import { OWN_DESCS, OWN_KEYS, OWN_STRING_KEYS } from '@y14e/own';
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

  for (const key of (!settings.preserveSymbolKeys ? OWN_STRING_KEYS : OWN_KEYS)(
    object,
  )) {
    const desc = { ...descs[key] };

    if ('value' in desc) {
      desc.value = clone(desc.value, settings, refs);
    }

    Object.defineProperty(result, key, desc);
  }

  return result;
}
