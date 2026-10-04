import type { PlainObject } from '@/types';
import { isUnsafeKey } from '@/utils';

export const OWN_DESCS = Object.getOwnPropertyDescriptors;

export const OWN_ENUM_STRING_KEYS = (object: PlainObject): string[] => {
  const keys = Object.keys(object);

  for (const key of keys) {
    if (isUnsafeKey(key)) {
      keys.splice(keys.indexOf(key), 1);
    }
  }

  return keys;
};

export const OWN_ENUM_SYMBOL_KEYS = (object: PlainObject): symbol[] => {
  const keys = OWN_SYMBOL_KEYS(object);

  for (const key of keys) {
    if (!Object.prototype.propertyIsEnumerable.call(object, key)) {
      keys.splice(keys.indexOf(key), 1);
    }
  }

  return keys;
};

export const OWN_STRING_KEYS = (object: PlainObject): string[] => {
  const keys = Object.getOwnPropertyNames(object);

  for (const key of keys) {
    if (isUnsafeKey(key)) {
      keys.splice(keys.indexOf(key), 1);
    }
  }

  return keys;
};

export const OWN_SYMBOL_KEYS = Object.getOwnPropertySymbols;
