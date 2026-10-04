import type { PlainObject } from '@/types';

const IS_ENUMERABLE = Object.prototype.propertyIsEnumerable;
export const OWN_DESCS = Object.getOwnPropertyDescriptors;
export const OWN_ENUM_STRING_KEYS = Object.keys;
export const OWN_ENUM_SYMBOL_KEYS = (o: PlainObject): symbol[] =>
  OWN_SYMBOL_KEYS(o).filter((k) => IS_ENUMERABLE.call(o, k));
export const OWN_STRING_KEYS = Object.getOwnPropertyNames;
export const OWN_SYMBOL_KEYS = Object.getOwnPropertySymbols;
