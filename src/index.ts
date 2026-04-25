/**
 * Bunshin Clone
 * High-performance deep clone utility with descriptor support.
 * Supports circular ref and complex built-in types.
 *
 * @version 1.0.7
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

type Ref = WeakMap<object, unknown>;

// -----------------------------------------------------------------------------
// [Constants]
// -----------------------------------------------------------------------------

const EMPTY_OPTIONS = {};
const { hasOwnProperty: HAS_OWN } = Object.prototype;
const { toString: OBJECT_TO_STRING } = Object.prototype;

// -----------------------------------------------------------------------------
// [API]
// -----------------------------------------------------------------------------

export default function bunshinClone<T>(
  source: T,
  options?: BunshinCloneOptions,
): T {
  return clone(source, options ?? EMPTY_OPTIONS, new WeakMap()) as T;
}

// -----------------------------------------------------------------------------
// [Clone]
// -----------------------------------------------------------------------------

function clone(node: unknown, options: BunshinCloneOptions, ref: Ref): unknown {
  if (!isObject(node)) {
    return node;
  }

  // [Ref]
  const cached = ref.get(node as object);

  if (cached !== undefined) {
    return cached;
  }

  // With descriptors
  if (options.preserveDescriptors && isPlainObject(node)) {
    return cloneWithDescriptors(node as Object, options, ref);
  }

  // Array
  if (Array.isArray(node)) {
    const result: unknown[] = [];
    ref.set(node, result); // [Ref.set]

    for (let i = 0, l = node.length; i < l; i++) {
      result[i] = clone(node[i], options, ref);
    }

    return result;
  }

  // Plain object
  if (isPlainObject(node)) {
    const result = Object.create(Object.getPrototypeOf(node)) as Object;
    ref.set(node as object, result); // [Ref.set]

    for (const key in node as object) {
      if (!HAS_OWN.call(node, key) || isUnsafeKey(key)) {
        continue;
      }

      result[key] = clone((node as Object)[key], options, ref);
    }

    return result;
  }

  // Map
  if (node instanceof Map) {
    const result = new Map();
    ref.set(node, result); // [Ref.set]

    for (const [key, value] of node) {
      result.set(clone(key, options, ref), clone(value, options, ref));
    }

    return result;
  }

  // Set
  if (node instanceof Set) {
    const result = new Set();
    ref.set(node, result); // [Ref.set]

    for (const item of node) {
      result.add(clone(item, options, ref));
    }

    return result;
  }

  // Date
  if (node instanceof Date) {
    const result = new Date(node.getTime());
    ref.set(node, result); // [Ref.set]
    return result;
  }

  // RegExp
  if (node instanceof RegExp) {
    const result = new RegExp(node.source, node.flags);
    ref.set(node, result); // [Ref.set]
    result.lastIndex = node.lastIndex;
    return result;
  }

  // ArrayBuffer
  if (node instanceof ArrayBuffer) {
    const result = node.slice(0);
    ref.set(node, result); // [Ref.set]
    return result;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(node)) {
    const { buffer, byteOffset, byteLength } = node;
    if (node instanceof DataView) {
      const result = new DataView(buffer.slice(0), byteOffset, byteLength);
      ref.set(node, result); // [Ref.set]
      return result;
    } else {
      const Ctor = node.constructor as new (
        buffer: ArrayBufferLike,
      ) => ArrayBufferView;
      const result = new Ctor(
        buffer.slice(byteOffset, byteOffset + byteLength),
      );
      ref.set(node, result); // [Ref.set]
      return result;
    }
  }

  // Error and DOMException
  if (
    node instanceof Error ||
    (typeof DOMException !== 'undefined' && node instanceof DOMException)
  ) {
    const result = cloneError(node, options, ref);
    ref.set(node, result); // [Ref.set]
    return result;
  }

  // Blob
  if (typeof Blob !== 'undefined' && node instanceof Blob) {
    const result = node.slice(0, node.size, node.type);
    ref.set(node, result); // [Ref.set]
    return result;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && node instanceof ImageData) {
    const result = new ImageData(
      new Uint8ClampedArray(node.data),
      node.width,
      node.height,
    );
    ref.set(node, result); // [Ref.set]
    return result;
  }

  // URL
  if (typeof URL !== 'undefined' && node instanceof URL) {
    const result = new URL(node.href);
    ref.set(node, result); // [Ref.set]
    return result;
  }

  // URLSearchParams
  if (
    typeof URLSearchParams !== 'undefined' &&
    node instanceof URLSearchParams
  ) {
    const result = new URLSearchParams();
    ref.set(node, result); // [Ref.set]

    for (const [key, value] of node) {
      result.append(key, value);
    }

    return result;
  }

  // Fallback: unsupported types
  ref.set(node as object, node); // [Ref.set]
  return node;
}

function cloneError(
  value: Error,
  options: BunshinCloneOptions,
  ref: Ref,
): Error {
  const name = value.name || 'Error';
  const message = value.message || '';
  let result: Error;

  switch (name) {
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
    default:
      result = new Error(message);
      result.name = name;
  }

  if (!options.preserveDescriptors && 'cause' in value) {
    const cause = value.cause;
    if (cause !== undefined) {
      result.cause = clone(cause, options, ref);
    }
  }

  if (value.stack) {
    result.stack = value.stack;
  }

  for (const key of Object.keys(value) as (keyof typeof value)[]) {
    if (key === 'name' || key === 'message' || key === 'stack') {
      continue;
    }

    result[key] = value[key];
  }

  return result;
}

function cloneWithDescriptors(
  node: Object,
  options: BunshinCloneOptions,
  ref: Ref,
): Object {
  const result = Object.create(Object.getPrototypeOf(node)) as Object;
  ref.set(node, result); // [Ref.set]
  const descs = Object.getOwnPropertyDescriptors(node);
  const keys = Reflect.ownKeys(descs);

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i] as PropertyKey;

    if (isUnsafeKey(key)) {
      continue;
    }

    const desc: PropertyDescriptor = { ...descs[key] };

    if ('value' in desc) {
      desc.value = clone(desc.value, options, ref);
    }

    try {
      Object.defineProperty(result, key, desc);
    } catch (error) {
      if (options.strictDescriptors) {
        throw error;
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// [Utils]
// -----------------------------------------------------------------------------

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

function isPlainObject(value: unknown): boolean {
  return OBJECT_TO_STRING.call(value) === '[object Object]';
}

function isUnsafeKey(key: PropertyKey): boolean {
  return (
    typeof key === 'string' &&
    (key === '__proto__' || key === 'prototype' || key === 'constructor')
  );
}
