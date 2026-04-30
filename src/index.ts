/**
 * Bunshin Clone
 * High-performance deep clone utility with descriptor support.
 * Handles circular ref and complex built-in types.
 *
 * @version 1.0.13
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) 2026 Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/bunshin-clone}
 */

// -----------------------------------------------------------------------------
// [Types]
// -----------------------------------------------------------------------------

export interface BunshinCloneOptions {
  readonly preserveDescriptors?: boolean;
  readonly strictDescriptors?: boolean;
}

type Object = Record<PropertyKey, unknown>;

type Refs = WeakMap<object, unknown>;

// -----------------------------------------------------------------------------
// [Constants]
// -----------------------------------------------------------------------------

const EMPTY_OPTIONS = {};
const { hasOwnProperty: HAS_OWN } = Object.prototype;

// -----------------------------------------------------------------------------
// [API]
// -----------------------------------------------------------------------------

export default function bunshinClone<T>(
  source: T,
  options?: BunshinCloneOptions,
): T {
  return clone(source, options ?? EMPTY_OPTIONS, new WeakMap());
}

// -----------------------------------------------------------------------------
// [Clone]
// -----------------------------------------------------------------------------

function clone(node: unknown, options: BunshinCloneOptions, refs: Refs) {
  if (!isObject(node)) {
    return node;
  }

  // [Refs]
  const ref = refs.get(node);

  if (ref !== undefined) {
    return ref;
  }

  // With descriptors
  if (options.preserveDescriptors && isPlainObject(node)) {
    return cloneWithDescriptors(node as Object, options, refs);
  }

  // Array
  if (Array.isArray(node)) {
    const result: unknown[] = [];
    refs.set(node, result); // [Refs.set]

    for (let i = 0, l = node.length; i < l; i++) {
      result[i] = clone(node[i], options, refs);
    }

    return result;
  }

  // Plain object
  if (isPlainObject(node)) {
    const result = Object.create(Object.getPrototypeOf(node));
    refs.set(node, result); // [Refs.set]

    for (const key in node) {
      if (!HAS_OWN.call(node, key) || isUnsafeKey(key)) {
        continue;
      }

      result[key] = clone((node as Object)[key], options, refs);
    }

    return result;
  }

  // Map
  if (node instanceof Map) {
    const result = new Map();
    refs.set(node, result); // [Refs.set]

    for (const [key, value] of node) {
      result.set(clone(key, options, refs), clone(value, options, refs));
    }

    return result;
  }

  // Set
  if (node instanceof Set) {
    const result = new Set();
    refs.set(node, result); // [Refs.set]

    for (const item of node) {
      result.add(clone(item, options, refs));
    }

    return result;
  }

  // Date
  if (node instanceof Date) {
    const result = new Date(node.getTime());
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // RegExp
  if (node instanceof RegExp) {
    const result = new RegExp(node.source, node.flags);
    refs.set(node, result); // [Refs.set]
    result.lastIndex = node.lastIndex;
    return result;
  }

  // ArrayBuffer
  if (node instanceof ArrayBuffer) {
    const result = node.slice(0);
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(node)) {
    const { buffer, byteOffset, byteLength } = node;

    if (node instanceof DataView) {
      const result = new DataView(buffer.slice(0), byteOffset, byteLength);
      refs.set(node, result); // [Refs.set]
      return result;
    } else {
      const Ctor = node.constructor as new (
        buffer: ArrayBufferLike,
      ) => ArrayBufferView;
      const result = new Ctor(
        buffer.slice(byteOffset, byteOffset + byteLength),
      );
      refs.set(node, result); // [Refs.set]
      return result;
    }
  }

  // Error and DOMException
  if (
    node instanceof Error ||
    (typeof DOMException !== 'undefined' && node instanceof DOMException)
  ) {
    return cloneError(node, options, refs);
  }

  // Blob
  if (typeof Blob !== 'undefined' && node instanceof Blob) {
    const result = node.slice(0, node.size, node.type);
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && node instanceof ImageData) {
    const result = new ImageData(
      new Uint8ClampedArray(node.data),
      node.width,
      node.height,
    );
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // URL
  if (typeof URL !== 'undefined' && node instanceof URL) {
    const result = new URL(node.href);
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // URLSearchParams
  if (
    typeof URLSearchParams !== 'undefined' &&
    node instanceof URLSearchParams
  ) {
    const result = new URLSearchParams();
    refs.set(node, result); // [Refs.set]

    for (const [key, value] of node) {
      result.append(key, value);
    }

    return result;
  }

  // Fallback: unsupported types
  refs.set(node, node); // [Refs.set]
  return node;
}

function cloneError(
  value: Error | DOMException,
  options: BunshinCloneOptions,
  refs: Refs,
): Error | DOMException {
  if (value instanceof DOMException) {
    const result = new DOMException(value.message, value.name);
    refs.set(value, result); // [Refs.set]
    return result;
  }

  const name = value.name || 'Error';
  const message = value.message || '';
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

  if (value.stack) {
    try {
      result.stack = value.stack;
    } catch {}
  }

  if ('cause' in value && value.cause !== undefined) {
    result.cause = clone(value.cause, options, refs);
  }

  for (const key of Object.keys(value) as (keyof Error)[]) {
    result[key] = clone(value[key], options, refs);
  }

  return result;
}

function cloneWithDescriptors(
  node: Object,
  options: BunshinCloneOptions,
  refs: Refs,
) {
  const result = Object.create(Object.getPrototypeOf(node));
  refs.set(node, result); // [Refs.set]
  const descs = Object.getOwnPropertyDescriptors(node);

  forEachOwnKey(descs, (key) => {
    if (isUnsafeKey(key)) {
      return;
    }

    const desc = { ...descs[key] };

    if ('value' in desc) {
      desc.value = clone(desc.value, options, refs);
    }

    try {
      Object.defineProperty(result, key, desc);
    } catch (error) {
      if (options.strictDescriptors) {
        throw error;
      }
    }
  });

  return result;
}

// -----------------------------------------------------------------------------
// [Utils]
// -----------------------------------------------------------------------------

function forEachOwnKey(object: object, fn: (key: string | symbol) => void) {
  for (const key of Object.keys(object)) {
    fn(key);
  }

  const symbols = Object.getOwnPropertySymbols(object);

  for (let i = 0, l = symbols.length; i < l; i++) {
    fn(symbols[i] as symbol);
  }
}

function isObject(value: unknown) {
  return typeof value === 'object' && value !== null;
}

function isPlainObject(value: unknown) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isUnsafeKey(key: PropertyKey) {
  return (
    typeof key === 'string' &&
    (key === '__proto__' || key === 'prototype' || key === 'constructor')
  );
}
