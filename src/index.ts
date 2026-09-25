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
const { hasOwnProperty: HAS_OWN } = Object.prototype;

export function bunshinClone<T>(
  source: T,
  options: Partial<BunshinCloneOptions> = EMPTY_OPTIONS,
  refs: Refs = new WeakMap(),
): T {
  return clone(source, resolveOptions(options), refs);
}

function clone<T>(source: T, settings: BunshinCloneOptions, refs: Refs): T {
  if (!isObject(source)) {
    return source;
  }

  // [Refs]
  if (refs.has(source)) {
    return refs.get(source) as T;
  }

  // With descriptors
  if (settings.preserveDescriptors && isPlainObject(source)) {
    return cloneWithDescriptors(source, settings, refs) as T;
  }

  // Array
  if (Array.isArray(source)) {
    const { length } = source;
    const result = new Array<unknown>(length);
    refs.set(source, result); // [Refs]

    for (let i = 0; i < length; i++) {
      result[i] = clone(source[i], settings, refs);
    }

    return result as T;
  }

  // Plain object
  if (isPlainObject(source)) {
    const result: PlainObject = Object.create(Object.getPrototypeOf(source));
    refs.set(source, result); // [Refs]

    for (const key in source) {
      if (HAS_OWN.call(source, key) && !isUnsafeKey(key)) {
        result[key] = clone(source[key], settings, refs);
      }
    }

    return result as T;
  }

  // Map
  if (source instanceof Map) {
    const result = new Map<unknown, unknown>();
    refs.set(source, result); // [Refs]

    for (const [key, value] of source) {
      result.set(clone(key, settings, refs), clone(value, settings, refs));
    }

    return result as T;
  }

  // Set
  if (source instanceof Set) {
    const result = new Set<unknown>();
    refs.set(source, result); // [Refs]

    for (const item of source) {
      result.add(clone(item, settings, refs));
    }

    return result as T;
  }

  // Date
  if (source instanceof Date) {
    const result = new Date(source.getTime());
    refs.set(source, result); // [Refs]
    return result as T;
  }

  // RegExp
  if (source instanceof RegExp) {
    const result = new RegExp(source.source, source.flags);
    refs.set(source, result); // [Refs]
    result.lastIndex = source.lastIndex;
    return result as T;
  }

  // ArrayBuffer
  if (source instanceof ArrayBuffer) {
    const result = source.slice(0);
    refs.set(source, result); // [Refs]
    return result as T;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(source)) {
    // DataView
    if (source instanceof DataView) {
      const { buffer, byteOffset, byteLength } = source;
      const result = new DataView(
        cloneBuffer(buffer, refs),
        byteOffset,
        byteLength,
      );
      refs.set(source, result); // [Refs]
      return result as T;
    }

    // TypedArray
    const view = source as unknown as TypedArray;

    // Do not preserve buffer sharing; faster (default)
    if (!settings.preserveBufferSharing) {
      const Ctor = view.constructor as new (_: TypedArray) => TypedArray;
      const result = new Ctor(view);
      refs.set(source, result); // [Refs]
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
    refs.set(source, result); // [Refs]
    return result as T;
  }

  // DOMException and Error
  if (source instanceof DOMException || source instanceof Error) {
    return cloneError(source, settings, refs) as T;
  }

  // Blob
  if (source instanceof Blob) {
    const result = source.slice(0, source.size, source.type);
    refs.set(source, result); // [Refs]
    return result as T;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
    const { data, width, height, colorSpace } = source;
    const result = new ImageData(new Uint8ClampedArray(data), width, height, {
      colorSpace,
    });
    refs.set(source, result); // [Refs]
    return result as T;
  }

  // URL
  if (source instanceof URL) {
    const result = new URL(source.href);
    refs.set(source, result); // [Refs]
    return result as T;
  }

  // URLSearchParams
  if (source instanceof URLSearchParams) {
    const result = new URLSearchParams();
    refs.set(source, result); // [Refs]

    for (const [key, value] of source) {
      result.append(key, value);
    }

    return result as T;
  }

  // Fallback: unsupported types
  refs.set(source, source); // [Refs]
  return source;
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
  source: DOMException | Error,
  settings: BunshinCloneOptions,
  refs: Refs,
): DOMException | Error {
  const result = createErrorInstance(source, settings, refs);
  refs.set(source, result); // [Refs]

  // DOMException
  if (source instanceof DOMException) {
    return result;
  }

  // Error
  const { stack, cause } = source;

  if (stack) {
    try {
      result.stack = stack;
    } catch {}
  }

  if ('cause' in source && cause !== undefined) {
    result.cause = clone(cause, settings, refs);
  }

  for (const key of Object.keys(source)) {
    Reflect.set(result, key, clone(Reflect.get(source, key), settings, refs));
  }

  return result;
}

function cloneWithDescriptors(
  source: PlainObject,
  settings: BunshinCloneOptions,
  refs: Refs,
): PlainObject {
  const result: PlainObject = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result); // [Refs]
  const descs = Object.getOwnPropertyDescriptors(source);

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
  source: DOMException | Error,
  settings: BunshinCloneOptions,
  refs: Refs,
): DOMException | Error {
  const { message, name } = source;

  // DOMException
  if (source instanceof DOMException) {
    return new DOMException(message, name);
  }

  // AggregateError
  if (source instanceof AggregateError) {
    return new AggregateError(
      source.errors.map((e) => clone(e, settings, refs)),
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
