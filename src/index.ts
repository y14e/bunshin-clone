import type { TypedArray } from 'type-fest';

export interface BunshinCloneOptions {
  preserveBufferSharing: boolean;
  preserveDescriptors: boolean;
  preserveSymbolKeys: boolean;
  strictDescriptors: boolean;
}

type ArrayBufferView = DataView | TypedArray;
export type PlainObject = Record<PropertyKey, unknown>;
type Refs = WeakMap<object, object>;

export function bunshinClone<T>(
  value: T,
  options: Partial<BunshinCloneOptions> = {},
  refs: Refs = new WeakMap(),
): T {
  return clone(value, resolveOptions(options), refs);
}

function clone<T>(value: T, settings: BunshinCloneOptions, refs: Refs): T {
  // Primitive: return as-is
  if (!isObject(value)) {
    return value;
  }

  // [Refs]
  if (refs.has(value)) {
    return refs.get(value) as T;
  }

  const isClonePlainObject = isPlainObject(value);

  // With descriptors
  if (settings.preserveDescriptors && isClonePlainObject) {
    return cloneWithDescriptors(value, settings, refs) as T;
  }

  // Array
  if (Array.isArray(value)) {
    return cloneArray(value, settings, refs) as T;
  }

  // Plain object
  if (isClonePlainObject) {
    return clonePlainObject(value, settings, refs) as T;
  }

  // Map
  if (value instanceof Map) {
    return cloneMap(value, settings, refs) as T;
  }

  // Set
  if (value instanceof Set) {
    return cloneSet(value, settings, refs) as T;
  }

  // Date
  if (value instanceof Date) {
    const result = new Date(value.getTime());
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // RegExp
  if (value instanceof RegExp) {
    const { source, flags, lastIndex } = value;
    const result = new RegExp(source, flags);
    refs.set(value, result); // [Refs]
    result.lastIndex = lastIndex;
    return result as T;
  }

  // ArrayBuffer
  if (value instanceof ArrayBuffer) {
    const result = value.slice(0);
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // ArrayBuffer view (DataView/TypedArray)
  if (ArrayBuffer.isView(value)) {
    return cloneArrayBufferView(
      value as unknown as ArrayBufferView,
      settings,
      refs,
    ) as T;
  }

  // Error
  if (value instanceof Error) {
    return cloneError(value, settings, refs) as T;
  }

  // Blob
  if (value instanceof Blob) {
    const { size, type } = value;
    const result = value.slice(0, size, type);
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && value instanceof ImageData) {
    const { data, width, height, colorSpace } = value;
    const result = new ImageData(new Uint8ClampedArray(data), width, height, {
      colorSpace,
    });
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // URL
  if (value instanceof URL) {
    const result = new URL(value.href);
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // URLSearchParams
  if (value instanceof URLSearchParams) {
    const result = new URLSearchParams(value);
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // Unsupported types: return as-is
  refs.set(value, value); // [Refs]
  return value;
}

const OWN_DESCS = Object.getOwnPropertyDescriptors;
const OWN_ENUM_STRING_KEYS = Object.keys;
const OWN_ENUM_SYMBOL_KEYS = (object: PlainObject): symbol[] =>
  OWN_SYMBOL_KEYS(object).filter((k) =>
    Object.prototype.propertyIsEnumerable.call(object, k),
  );
const OWN_STRING_KEYS = Object.getOwnPropertyNames;
const OWN_SYMBOL_KEYS = Object.getOwnPropertySymbols;

function cloneWithDescriptors(
  object: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(object));
  refs.set(object, result); // [Refs]
  const descs = OWN_DESCS(object);

  for (const key of OWN_STRING_KEYS(object)) {
    if (isUnsafeKey(key)) {
      continue;
    }

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

  if (settings.preserveSymbolKeys) {
    for (const key of OWN_SYMBOL_KEYS(object)) {
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
  }

  return result;
}

function cloneArray(
  array: unknown[],
  settings: BunshinCloneOptions,
  refs: Refs,
): unknown[] {
  const result = isPrimitiveArray(array)
    ? array.slice() // Fast path: primitive array
    : array.map((item) => clone(item, settings, refs));
  refs.set(array, result); // [Refs]
  return result;
}

function clonePlainObject(
  object: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(object));
  refs.set(object, result); // [Refs]

  for (const key of OWN_ENUM_STRING_KEYS(object)) {
    if (!isUnsafeKey(key)) {
      result[key] = clone(object[key], settings, refs);
    }
  }

  if (settings.preserveSymbolKeys) {
    for (const key of OWN_ENUM_SYMBOL_KEYS(object)) {
      result[key] = clone(object[key], settings, refs);
    }
  }

  return result;
}

function cloneMap(
  map: Map<unknown, unknown>,
  settings: BunshinCloneOptions,
  refs: Refs,
): Map<unknown, unknown> {
  const result = new Map<unknown, unknown>();
  refs.set(map, result); // [Refs]

  for (const [key, value] of map) {
    result.set(clone(key, settings, refs), clone(value, settings, refs));
  }

  return result;
}

function cloneSet(
  set: Set<unknown>,
  settings: BunshinCloneOptions,
  refs: Refs,
): Set<unknown> {
  // Fast path: primitive Set
  if (isPrimitiveSet(set)) {
    const result = new Set(set);
    refs.set(set, result); // [Refs]
    return result;
  }

  const result = new Set<unknown>();
  refs.set(set, result); // [Refs]

  for (const item of set) {
    result.add(clone(item, settings, refs));
  }

  return result;
}

function cloneArrayBufferView(
  view: ArrayBufferView,
  settings: BunshinCloneOptions,
  refs: Refs,
): ArrayBufferView {
  // DataView
  if (view instanceof DataView) {
    const { buffer, byteOffset, byteLength } = view;
    const result = new DataView(
      cloneBuffer(buffer, refs),
      byteOffset,
      byteLength,
    );
    refs.set(view, result); // [Refs]
    return result;
  }

  // TypedArray

  // Do not preserve buffer sharing; faster (default)
  if (!settings.preserveBufferSharing) {
    const Ctor = view.constructor as new (_: TypedArray) => TypedArray;
    const result = new Ctor(view);
    refs.set(view, result); // [Refs]
    return result;
  }

  // Preserve buffer sharing; slower (optional)
  const Ctor = view.constructor as new (
    buffer: ArrayBufferLike,
    byteOffset: number,
    length: number,
  ) => TypedArray;
  const { buffer, byteOffset, length } = view;
  const result = new Ctor(cloneBuffer(buffer, refs), byteOffset, length);
  refs.set(view, result); // [Refs]
  return result;
}

function cloneBuffer(buffer: ArrayBufferLike, refs: Refs): ArrayBufferLike {
  if (refs.has(buffer)) {
    return refs.get(buffer) as ArrayBufferLike;
  }

  const result = buffer.slice(0);
  refs.set(buffer, result); // [Refs]
  return result;
}

function cloneError(
  error: Error,
  settings: BunshinCloneOptions,
  refs: Refs,
): Error {
  const result = createErrorInstance(error, settings, refs);
  refs.set(error, result); // [Refs]

  // DOMException
  if (error instanceof DOMException) {
    return result;
  }

  // Others
  const { stack, cause } = error;

  if (stack) {
    try {
      result.stack = stack;
    } catch {}
  }

  if ('cause' in error && cause !== undefined) {
    result.cause = clone(cause, settings, refs);
  }

  for (const key of OWN_ENUM_STRING_KEYS(error)) {
    Reflect.set(result, key, clone(Reflect.get(error, key), settings, refs));
  }

  return result;
}

const ERROR_CTORS: Record<string, new (message?: string) => Error> = {
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
};

function createErrorInstance(
  error: DOMException | Error,
  settings: BunshinCloneOptions,
  refs: Refs,
): DOMException | Error {
  const { message, name } = error;

  // DOMException
  if (error instanceof DOMException) {
    return new DOMException(message, name);
  }

  // AggregateError
  if (error instanceof AggregateError) {
    return new AggregateError(
      error.errors.map((e) => clone(e, settings, refs)),
      message,
    );
  }

  // Other standard built-in errors
  const Ctor = ERROR_CTORS[name];

  if (Ctor) {
    return new Ctor(message);
  }

  // Unknown error types
  const result = new Error(message);
  result.name = name;
  return result;
}

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

export function isPrimitiveArray(array: unknown[]): boolean {
  return array.every((item) => !isObject(item));
}

function isPrimitiveSet(set: Set<unknown>): boolean {
  for (const value of set) {
    if (isObject(value)) {
      return false;
    }
  }

  return true;
}

export function isUnsafeKey(key: PropertyKey): boolean {
  return (
    typeof key === 'string' &&
    (key === '__proto__' || key === 'prototype' || key === 'constructor')
  );
}

function resolveOptions(
  options: Partial<BunshinCloneOptions>,
): BunshinCloneOptions {
  let {
    preserveBufferSharing = false,
    preserveDescriptors = false,
    strictDescriptors = false,
    preserveSymbolKeys = false,
  } = options;

  if (typeof preserveSymbolKeys !== 'boolean') {
    console.warn('Invalid preserveSymbolKeys option. Fallback: false.');
    preserveSymbolKeys = false;
  }

  if (typeof preserveBufferSharing !== 'boolean') {
    console.warn('Invalid preserveBufferSharing option. Fallback: false.');
    preserveBufferSharing = false;
  }

  if (typeof preserveDescriptors !== 'boolean') {
    console.warn('Invalid preserveDescriptors option. Fallback: false.');
    preserveDescriptors = false;
  }

  if (typeof strictDescriptors !== 'boolean') {
    console.warn('Invalid strictDescriptors option. Fallback: false.');
    strictDescriptors = false;
  }

  return {
    preserveBufferSharing,
    preserveDescriptors,
    preserveSymbolKeys,
    strictDescriptors,
  };
}
