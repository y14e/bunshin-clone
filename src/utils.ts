import type { PlainObject } from '@/types';

export function isObject(value: unknown): value is object {
  // 'typeof null' is 'object', but TS 'object' type is non-null.
  return typeof value === 'object' && value !== null;
}

export function isPlainObject(value: unknown): value is PlainObject {
  if (!isObject(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isUnsafeKey(key: PropertyKey): boolean {
  return (
    typeof key === 'string' &&
    (key === '__proto__' || key === 'prototype' || key === 'constructor')
  );
}
