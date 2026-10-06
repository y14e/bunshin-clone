import {
  OWN_DESCS,
  OWN_ENUM_KEYS,
  OWN_ENUM_STRING_KEYS,
  OWN_KEYS,
  OWN_STRING_KEYS,
} from '@y14e/own';
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
  const { preserveDescriptors, preserveSymbolKeys } = settings;

  if (!preserveDescriptors) {
    for (const key of (!preserveSymbolKeys
      ? OWN_ENUM_STRING_KEYS
      : OWN_ENUM_KEYS)(object)) {
      result[key] = clone(object[key], settings, refs);
    }

    return result;
  }

  const descs = OWN_DESCS(object);

  for (const key of (!preserveSymbolKeys ? OWN_STRING_KEYS : OWN_KEYS)(
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
