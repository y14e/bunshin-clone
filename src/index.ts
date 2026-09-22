export interface BunshinCloneOptions {
  preserveDescriptors: boolean;
  strictDescriptors: boolean;
}

type PlainObject = Record<PropertyKey, unknown>;

type Refs = WeakMap<object, unknown>;

const EMPTY_OPTIONS = {};
const { hasOwnProperty: HAS_OWN } = Object.prototype;

export function bunshinClone<T>(
  source: T,
  options: Partial<BunshinCloneOptions> = EMPTY_OPTIONS,
  refs: Refs = new WeakMap(),
): T {
  return clone(source, options, refs);
}

function clone<T>(
  node: T,
  options: Partial<BunshinCloneOptions>,
  refs: Refs,
): T {
  if (!isObject(node)) {
    return node;
  }

  // [Refs]
  const ref = refs.get(node);

  if (ref !== undefined) {
    return ref as T;
  }

  const settings = resolveOptions(options);

  // With descriptors
  if (settings.preserveDescriptors && isPlainObject(node)) {
    return cloneWithDescriptors(node, settings, refs) as T;
  }

  // Array
  if (Array.isArray(node)) {
    const result: unknown[] = [];
    refs.set(node, result); // [Refs]

    for (let i = 0, l = node.length; i < l; i++) {
      result[i] = clone(node[i], settings, refs);
    }

    return result as T;
  }

  // Plain object
  if (isPlainObject(node)) {
    const result = Object.create(Object.getPrototypeOf(node));
    refs.set(node, result); // [Refs]

    for (const key in node) {
      if (!HAS_OWN.call(node, key) || isUnsafeKey(key)) {
        continue;
      }

      result[key] = clone(node[key], settings, refs);
    }

    return result as T;
  }

  // Map
  if (node instanceof Map) {
    const result = new Map();
    refs.set(node, result); // [Refs]

    for (const [key, value] of node) {
      result.set(clone(key, settings, refs), clone(value, settings, refs));
    }

    return result as T;
  }

  // Set
  if (node instanceof Set) {
    const result = new Set();
    refs.set(node, result); // [Refs]

    for (const item of node) {
      result.add(clone(item, settings, refs));
    }

    return result as T;
  }

  // Date
  if (node instanceof Date) {
    const result = new Date(node.getTime());
    refs.set(node, result); // [Refs]
    return result as T;
  }

  // RegExp
  if (node instanceof RegExp) {
    const result = new RegExp(node.source, node.flags);
    refs.set(node, result); // [Refs]
    result.lastIndex = node.lastIndex;
    return result as T;
  }

  // ArrayBuffer
  if (node instanceof ArrayBuffer) {
    const result = node.slice(0);
    refs.set(node, result); // [Refs]
    return result as T;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(node)) {
    const { buffer, byteOffset, byteLength } = node;

    // DataView
    if (node instanceof DataView) {
      const result = new DataView(buffer.slice(0), byteOffset, byteLength);
      refs.set(node, result); // [Refs]
      return result as T;
    }

    // TypedArray
    const Ctor = node.constructor as new (
      buffer: ArrayBufferLike,
    ) => ArrayBufferView;
    const result = new Ctor(buffer.slice(byteOffset, byteOffset + byteLength));
    refs.set(node, result); // [Refs]
    return result as T;
  }

  // DOMException and Error
  if (node instanceof DOMException || node instanceof Error) {
    return cloneError(node, settings, refs) as T;
  }

  // Blob
  if (node instanceof Blob) {
    const result = node.slice(0, node.size, node.type);
    refs.set(node, result); // [Refs]
    return result as T;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && node instanceof ImageData) {
    const { data, width, height, colorSpace } = node;
    const result = new ImageData(new Uint8ClampedArray(data), width, height, {
      colorSpace,
    });
    refs.set(node, result); // [Refs]
    return result as T;
  }

  // URL
  if (node instanceof URL) {
    const result = new URL(node.href);
    refs.set(node, result); // [Refs]
    return result as T;
  }

  // URLSearchParams
  if (node instanceof URLSearchParams) {
    const result = new URLSearchParams();
    refs.set(node, result); // [Refs]

    for (const [key, value] of node) {
      result.append(key, value);
    }

    return result as T;
  }

  // Fallback: unsupported types
  refs.set(node, node); // [Refs]
  return node;
}

function cloneError<T extends DOMException | Error>(
  value: T,
  settings: Partial<BunshinCloneOptions>,
  refs: Refs,
): T {
  const result = createErrorInstance(value, settings, refs);
  refs.set(value, result); // [Refs]

  // DOMException
  if (value instanceof DOMException) {
    return result as T;
  }

  // Error
  if (value.stack) {
    try {
      result.stack = value.stack;
    } catch {}
  }

  if ('cause' in value && value.cause !== undefined) {
    (result as Error).cause = clone(value.cause, settings, refs);
  }

  for (const key of Object.keys(value)) {
    Reflect.set(result, key, clone(Reflect.get(value, key), settings, refs));
  }

  return result as T;
}

function cloneWithDescriptors<T extends PlainObject>(
  node: T,
  settings: Partial<BunshinCloneOptions>,
  refs: Refs,
): T {
  const result = Object.create(Object.getPrototypeOf(node));
  refs.set(node, result); // [Refs]
  const descs = Object.getOwnPropertyDescriptors(node);

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
  value: DOMException | Error,
  settings: Partial<BunshinCloneOptions>,
  refs: Refs,
): DOMException | Error {
  const { message, name } = value;

  // DOMException
  if (value instanceof DOMException) {
    return new DOMException(message, name);
  }

  // AggregateError
  if (value instanceof AggregateError) {
    return new AggregateError(
      value.errors.map((e) => clone(e, settings, refs)),
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
  let { preserveDescriptors = false, strictDescriptors = false } = options;

  if (typeof preserveDescriptors !== 'boolean') {
    console.warn('Invalid preserveDescriptors option. Fallback: false.');
    preserveDescriptors = false;
  }

  if (typeof strictDescriptors !== 'boolean') {
    console.warn('Invalid strictDescriptors option. Fallback: false.');
    strictDescriptors = false;
  }

  return { preserveDescriptors, strictDescriptors };
}
