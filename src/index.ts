/**
 * Bunshin Clone
 * High-performance deep clone utility with descriptor support.
 * Handles circular ref and complex built-in types.
 *
 * @version 1.2.9
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

function clone(
  node: unknown,
  options: Partial<BunshinCloneOptions>,
  refs: Refs,
) {
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

    for (const k in node) {
      if (!HAS_OWN.call(node, k) || isUnsafeKey(k)) {
        continue;
      }

      result[k] = clone((node as Object)[k], options, refs);
    }

    return result;
  }

  // Map
  if (node instanceof Map) {
    const result = new Map();
    refs.set(node, result); // [Refs.set]

    for (const [k, v] of node) {
      result.set(clone(k, options, refs), clone(v, options, refs));
    }

    return result;
  }

  // Set
  if (node instanceof Set) {
    const result = new Set();
    refs.set(node, result); // [Refs.set]

    for (const i of node) {
      result.add(clone(i, options, refs));
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

    // DataView
    if (node instanceof DataView) {
      const result = new DataView(buffer.slice(0), byteOffset, byteLength);
      refs.set(node, result); // [Refs.set]
      return result;
    }

    // TypedArray
    const Ctor = node.constructor as new (
      buffer: ArrayBufferLike,
    ) => ArrayBufferView;
    const result = new Ctor(buffer.slice(byteOffset, byteOffset + byteLength));
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // Error and DOMException
  if (node instanceof Error || node instanceof DOMException) {
    return cloneError(node, options, refs);
  }

  // Blob
  if (node instanceof Blob) {
    const result = node.slice(0, node.size, node.type);
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && node instanceof ImageData) {
    const { data, width, height, colorSpace } = node;
    const result = new ImageData(new Uint8ClampedArray(data), width, height, {
      colorSpace: colorSpace,
    });
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // URL
  if (node instanceof URL) {
    const result = new URL(node.href);
    refs.set(node, result); // [Refs.set]
    return result;
  }

  // URLSearchParams
  if (node instanceof URLSearchParams) {
    const result = new URLSearchParams();
    refs.set(node, result); // [Refs.set]

    for (const [k, v] of node) {
      result.append(k, v);
    }

    return result;
  }

  // Fallback: unsupported types
  refs.set(node, node); // [Refs.set]
  return node;
}

function cloneError(
  value: Error | DOMException,
  options: Partial<BunshinCloneOptions>,
  refs: Refs,
): Error | DOMException {
  const { name, message, cause, stack } = value;

  // DOMException
  if (value instanceof DOMException) {
    const result = new DOMException(message, name);
    refs.set(value, result); // [Refs.set]
    return result;
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
    result.cause = clone(cause, options, refs);
  }

  for (const k of Object.keys(value) as (keyof Error)[]) {
    result[k] = clone(value[k], options, refs);
  }

  return result;
}

function cloneWithDescriptors(
  node: Object,
  options: Partial<BunshinCloneOptions>,
  refs: Refs,
) {
  const result = Object.create(Object.getPrototypeOf(node));
  refs.set(node, result); // [Refs.set]
  const descs = Object.getOwnPropertyDescriptors(node);

  forEachOwnKey(descs, (k) => {
    if (isUnsafeKey(k)) {
      return;
    }

    const desc = { ...descs[k] };

    if ('value' in desc) {
      desc.value = clone(desc.value, options, refs);
    }

    try {
      Object.defineProperty(result, k, desc);
    } catch (error) {
      if (options.strictDescriptors) {
        throw error;
      }
    }
  });

  return result;
}

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

function forEachOwnKey(object: object, fn: (key: string | symbol) => void) {
  for (const k of Object.keys(object)) {
    fn(k);
  }

  for (const s of Object.getOwnPropertySymbols(object)) {
    fn(s);
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
