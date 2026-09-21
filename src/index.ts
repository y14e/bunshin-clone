/**
 * Bunshin Clone
 * High-performance deep clone utility with descriptor support.
 * Handles circular ref and complex built-in types.
 *
 * @version 1.2.15
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/bunshin-clone}
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BunshinCloneOptions {
  preserveDescriptors: boolean;
  strictDescriptors: boolean;
}

type Object = Record<PropertyKey, unknown>;

type Refs = WeakMap<object, unknown>;

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const EMPTY_OPTIONS = {};
const { hasOwnProperty: HAS_OWN } = Object.prototype;

// -----------------------------------------------------------------------------
// APIs
// -----------------------------------------------------------------------------

export function bunshinClone<T>(
  source: T,
  options: Partial<BunshinCloneOptions> = EMPTY_OPTIONS,
  refs: Refs = new WeakMap(),
): T {
  return clone(source, options, refs);
}

// -----------------------------------------------------------------------------
// Core
// -----------------------------------------------------------------------------

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
    refs.set(node, result); // [Refs.set]

    for (let i = 0, l = node.length; i < l; i++) {
      result[i] = clone(node[i], settings, refs);
    }

    return result as T;
  }

  // Plain object
  if (isPlainObject(node)) {
    const result = Object.create(Object.getPrototypeOf(node));
    refs.set(node, result); // [Refs.set]

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
    refs.set(node, result); // [Refs.set]

    for (const [key, value] of node) {
      result.set(clone(key, settings, refs), clone(value, settings, refs));
    }

    return result as T;
  }

  // Set
  if (node instanceof Set) {
    const result = new Set();
    refs.set(node, result); // [Refs.set]

    for (const item of node) {
      result.add(clone(item, settings, refs));
    }

    return result as T;
  }

  // Date
  if (node instanceof Date) {
    const result = new Date(node.getTime());
    refs.set(node, result); // [Refs.set]
    return result as T;
  }

  // RegExp
  if (node instanceof RegExp) {
    const result = new RegExp(node.source, node.flags);
    refs.set(node, result); // [Refs.set]
    result.lastIndex = node.lastIndex;
    return result as T;
  }

  // ArrayBuffer
  if (node instanceof ArrayBuffer) {
    const result = node.slice(0);
    refs.set(node, result); // [Refs.set]
    return result as T;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(node)) {
    const { buffer, byteOffset, byteLength } = node;

    // DataView
    if (node instanceof DataView) {
      const result = new DataView(buffer.slice(0), byteOffset, byteLength);
      refs.set(node, result); // [Refs.set]
      return result as T;
    }

    // TypedArray
    const Ctor = node.constructor as new (
      buffer: ArrayBufferLike,
    ) => ArrayBufferView;
    const result = new Ctor(buffer.slice(byteOffset, byteOffset + byteLength));
    refs.set(node, result); // [Refs.set]
    return result as T;
  }

  // DOMException and Error
  if (node instanceof DOMException || node instanceof Error) {
    return cloneError(node, settings, refs) as T;
  }

  // Blob
  if (node instanceof Blob) {
    const result = node.slice(0, node.size, node.type);
    refs.set(node, result); // [Refs.set]
    return result as T;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && node instanceof ImageData) {
    const { data, width, height, colorSpace } = node;
    const result = new ImageData(new Uint8ClampedArray(data), width, height, {
      colorSpace: colorSpace,
    });
    refs.set(node, result); // [Refs.set]
    return result as T;
  }

  // URL
  if (node instanceof URL) {
    const result = new URL(node.href);
    refs.set(node, result); // [Refs.set]
    return result as T;
  }

  // URLSearchParams
  if (node instanceof URLSearchParams) {
    const result = new URLSearchParams();
    refs.set(node, result); // [Refs.set]

    for (const [key, value] of node) {
      result.append(key, value);
    }

    return result as T;
  }

  // Fallback: unsupported types
  refs.set(node, node); // [Refs.set]
  return node;
}

function cloneError<T extends DOMException | Error>(
  value: T,
  settings: Partial<BunshinCloneOptions>,
  refs: Refs,
): T {
  const { name, message, cause, stack } = value;

  // DOMException
  if (value instanceof DOMException) {
    const result = new DOMException(message, name);
    refs.set(value, result); // [Refs.set]
    return result as T;
  }

  // Error
  let result: Error;

  switch (name) {
    case 'EvalError':
      result = new EvalError(message);
      break;
    case 'RangeError':
      result = new RangeError(message);
      break;
    case 'ReferenceError':
      result = new ReferenceError(message);
      break;
    case 'SyntaxError':
      result = new SyntaxError(message);
      break;
    case 'TypeError':
      result = new TypeError(message);
      break;
    case 'URIError':
      result = new URIError(message);
      break;
    default:
      result = new Error(message);
      result.name = name;
  }

  refs.set(value, result); // [Refs.set]

  if (stack) {
    try {
      result.stack = stack;
    } catch {}
  }

  if ('cause' in value && cause !== undefined) {
    result.cause = clone(cause, settings, refs);
  }

  for (const key of Object.keys(value)) {
    Reflect.set(result, key, clone(Reflect.get(value, key), settings, refs));
  }

  return result as T;
}

function cloneWithDescriptors<T extends Object>(
  node: T,
  settings: Partial<BunshinCloneOptions>,
  refs: Refs,
): T {
  const result = Object.create(Object.getPrototypeOf(node));
  refs.set(node, result); // [Refs.set]
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

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

export function forEachOwnKey(
  object: Object,
  callback: (key: string | symbol) => void,
): void {
  for (const key of Object.keys(object)) {
    callback(key);
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    callback(symbol);
  }
}

export function isObject(value: unknown): value is Object {
  return typeof value === 'object' && value !== null;
}

export function isPlainObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
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
