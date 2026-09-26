export interface BunshinCloneOptions {
  preserveBufferSharing: boolean;
  preserveDescriptors: boolean;
  strictDescriptors: boolean;
}

type PlainObject = Record<PropertyKey, unknown>;
type Refs = WeakMap<object, unknown>;
type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float16Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

const EMPTY_OPTIONS = {};
const { propertyIsEnumerable: IS_ENUMERABLE } = Object.prototype;

export function bunshinClone<T>(
  value: T,
  options: Partial<BunshinCloneOptions> = EMPTY_OPTIONS,
  refs: Refs = new WeakMap(),
): T {
  return clone(value, resolveOptions(options), refs);
}

function clone<T>(value: T, settings: BunshinCloneOptions, refs: Refs): T {
  if (!isObject(value)) {
    return value;
  }

  // [Refs]
  const ref = refs.get(value);

  if (ref !== undefined) {
    return ref as T;
  }

  // With descriptors
  if (settings.preserveDescriptors && isPlainObject(value)) {
    return cloneWithDescriptors(value, settings, refs) as T;
  }

  // Array
  if (Array.isArray(value)) {
    const { length } = value;
    const result = new Array<unknown>(length);
    refs.set(value, result); // [Refs]

    for (let i = 0; i < length; i++) {
      result[i] = clone(value[i], settings, refs);
    }

    return result as T;
  }

  // Plain object
  if (isPlainObject(value)) {
    const result: PlainObject = Object.create(Object.getPrototypeOf(value));
    refs.set(value, result); // [Refs]

    for (const key of Reflect.ownKeys(value)) {
      if (!isUnsafeKey(key) && IS_ENUMERABLE.call(value, key)) {
        result[key] = clone(value[key], settings, refs);
      }
    }

    return result as T;
  }

  // Map
  if (value instanceof Map) {
    const result = new Map<unknown, unknown>();
    refs.set(value, result); // [Refs]

    for (const [key, v] of value) {
      result.set(clone(key, settings, refs), clone(v, settings, refs));
    }

    return result as T;
  }

  // Set
  if (value instanceof Set) {
    const result = new Set<unknown>();
    refs.set(value, result); // [Refs]

    for (const item of value) {
      result.add(clone(item, settings, refs));
    }

    return result as T;
  }

  // Date
  if (value instanceof Date) {
    const result = new Date(value.getTime());
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // RegExp
  if (value instanceof RegExp) {
    const result = new RegExp(value.source, value.flags);
    refs.set(value, result); // [Refs]
    result.lastIndex = value.lastIndex;
    return result as T;
  }

  // ArrayBuffer
  if (value instanceof ArrayBuffer) {
    const result = value.slice(0);
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(value)) {
    // DataView
    if (value instanceof DataView) {
      const { buffer, byteOffset, byteLength } = value;
      const result = new DataView(
        cloneBuffer(buffer, refs),
        byteOffset,
        byteLength,
      );
      refs.set(value, result); // [Refs]
      return result as T;
    }

    // TypedArray
    const view = value as unknown as TypedArray;

    // Do not preserve buffer sharing; faster (default)
    if (!settings.preserveBufferSharing) {
      const Ctor = view.constructor as new (_: TypedArray) => TypedArray;
      const result = new Ctor(view);
      refs.set(value, result); // [Refs]
      return result as T;
    }

    // Preserve buffer sharing; slower (optional)
    const Ctor = view.constructor as new (
      buffer: ArrayBufferLike,
      byteOffset: number,
      length: number,
    ) => TypedArray;
    const { buffer, byteOffset, length } = view;
    const result = new Ctor(cloneBuffer(buffer, refs), byteOffset, length);
    refs.set(value, result); // [Refs]
    return result as T;
  }

  // DOMException and Error
  if (value instanceof DOMException || value instanceof Error) {
    return cloneError(value, settings, refs) as T;
  }

  // Blob
  if (value instanceof Blob) {
    const result = value.slice(0, value.size, value.type);
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
    const result = new URLSearchParams();
    refs.set(value, result); // [Refs]

    for (const [key, v] of value) {
      result.append(key, v);
    }

    return result as T;
  }

  // Fallback: unsupported types
  refs.set(value, value); // [Refs]
  return value;
}

function cloneBuffer(buffer: ArrayBufferLike, refs: Refs): ArrayBufferLike {
  const ref = refs.get(buffer);

  if (ref !== undefined) {
    return refs.get(buffer) as ArrayBufferLike;
  }

  const result = buffer.slice(0);
  refs.set(buffer, result); // [Refs]
  return result;
}

function cloneError(
  error: DOMException | Error,
  settings: BunshinCloneOptions,
  refs: Refs,
): DOMException | Error {
  const result = createErrorInstance(error, settings, refs);
  refs.set(error, result); // [Refs]

  // DOMException
  if (error instanceof DOMException) {
    return result;
  }

  // Error
  const { stack, cause } = error;

  if (stack) {
    try {
      result.stack = stack;
    } catch {}
  }

  if ('cause' in error && cause !== undefined) {
    result.cause = clone(cause, settings, refs);
  }

  for (const key of Object.keys(error)) {
    Reflect.set(result, key, clone(Reflect.get(error, key), settings, refs));
  }

  return result;
}

function cloneWithDescriptors(
  object: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(object));
  refs.set(object, result); // [Refs]
  const descs = Object.getOwnPropertyDescriptors(object);

  forEachOwnKey(descs, (key) => {
    if (isUnsafeKey(key)) {
      return;
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
  });

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

  // Standard built-in errors
  const Ctor = ERROR_CTORS[name];

  if (Ctor) {
    return new Ctor(message);
  }

  // Fallback: unknown error types
  const result = new Error(message);
  result.name = name;
  return result;
}

export function forEachOwnKey(
  object: PlainObject,
  callback: (key: string | symbol) => void,
): void {
  for (const key of Object.keys(object)) {
    callback(key);
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    callback(symbol);
  }
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
  } = options;

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

  return { preserveBufferSharing, preserveDescriptors, strictDescriptors };
}
