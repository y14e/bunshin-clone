/**
 * bunshin-clone
 * High-performance deep clone utility with descriptor support.
 * Supports circular ref and complex built-in types.
 *
 * @version 1.0.1
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

type Ref = WeakMap<object, unknown>;

type AnyObject = Record<PropertyKey, unknown>;

type PlainObject = Record<PropertyKey, unknown>;

// -----------------------------------------------------------------------------
// [Constants]
// -----------------------------------------------------------------------------

const EMPTY_OPTIONS = {} as const satisfies BunshinCloneOptions;
const { hasOwnProperty: HAS_OWN } = Object.prototype;
const { toString: OBJECT_TO_STRING } = Object.prototype;

// -----------------------------------------------------------------------------
// [API]
// -----------------------------------------------------------------------------

export default function bunshinClone(
  target: unknown,
  options?: BunshinCloneOptions,
  ref?: Ref,
): unknown {
  return clone(target, options ?? EMPTY_OPTIONS, ref ?? new WeakMap());
}

// -----------------------------------------------------------------------------
// [Clone]
// -----------------------------------------------------------------------------

function clone<T>(node: T, options: BunshinCloneOptions, ref: Ref): T {
  if (!isObject(node)) {
    return node;
  }

  // [Ref]
  const cached = ref.get(node);

  if (cached !== undefined) {
    return cached as T;
  }

  // With descriptors
  if (options.preserveDescriptors && isPlainObject(node)) {
    return cloneWithDescriptors(node as AnyObject, options, ref) as T;
  }

  // Array
  if (Array.isArray(node)) {
    const result: unknown[] = [];
    ref.set(node, result); // [Ref.set]

    for (let i = 0, l = node.length; i < l; i++) {
      result[i] = clone(node[i], options, ref);
    }

    return result as T;
  }

  // Plain object
  if (isPlainObject(node)) {
    const result = Object.create(Object.getPrototypeOf(node)) as PlainObject;
    ref.set(node, result); // [Ref.set]

    for (const key in node) {
      if (!HAS_OWN.call(node, key) || isUnsafeKey(key)) {
        continue;
      }

      result[key] = clone(node[key], options, ref);
    }

    return result as T;
  }

  // Map
  if (node instanceof Map) {
    const result = new Map();
    ref.set(node, result); // [Ref.set]

    for (const [key, value] of node) {
      result.set(clone(key, options, ref), clone(value, options, ref));
    }

    return result as T;
  }

  // Set
  if (node instanceof Set) {
    const result = new Set();
    ref.set(node, result); // [Ref.set]

    for (const item of node) {
      result.add(clone(item, options, ref));
    }

    return result as T;
  }

  // Date
  if (node instanceof Date) {
    const result = new Date(node.getTime());
    ref.set(node, result); // [Ref.set]
    return result as T;
  }

  // RegExp
  if (node instanceof RegExp) {
    const result = new RegExp(node.source, node.flags);
    ref.set(node, result); // [Ref.set]
    result.lastIndex = node.lastIndex;
    return result as T;
  }

  // ArrayBuffer
  if (node instanceof ArrayBuffer) {
    const result = node.slice(0);
    ref.set(node, result); // [Ref.set]
    return result as T;
  }

  // DataView and TypedArray
  if (ArrayBuffer.isView(node)) {
    if (node instanceof DataView) {
      const result = new DataView(
        node.buffer.slice(0),
        node.byteOffset,
        node.byteLength,
      );
      ref.set(node, result); // [Ref.set]
      return result as T;
    } else {
      const Ctor = node.constructor as new (_: typeof node) => typeof node;
      const result = new Ctor(node);
      ref.set(node, result); // [Ref.set]
      return result as T;
    }
  }

  // Error and DOMException
  if (
    node instanceof Error ||
    (typeof DOMException !== 'undefined' && node instanceof DOMException)
  ) {
    const result = cloneError(node, options, ref);
    ref.set(node, result); // [Ref.set]
    return result as T;
  }

  // Blob
  if (typeof Blob !== 'undefined' && node instanceof Blob) {
    const result = node.slice(0, node.size, node.type);
    ref.set(node, result); // [Ref.set]
    return result as T;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && node instanceof ImageData) {
    const result = new ImageData(
      new Uint8ClampedArray(node.data),
      node.width,
      node.height,
    );
    ref.set(node, result); // [Ref.set]
    return result as T;
  }

  // URL
  if (typeof URL !== 'undefined' && node instanceof URL) {
    const result = new URL(node.href);
    ref.set(node, result); // [Ref.set]
    return result as T;
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

    return result as T;
  }

  // Fallback: unsupported types
  ref.set(node, node); // [Ref.set]
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
    result.cause = clone(result.cause, options, ref);
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

export function cloneWithDescriptors(
  node: AnyObject,
  options: BunshinCloneOptions,
  ref: Ref,
): AnyObject {
  const result = Object.create(Object.getPrototypeOf(node)) as AnyObject;
  ref.set(node, result); // [Ref.set]
  const descriptors = Object.getOwnPropertyDescriptors(node);
  const keys = Reflect.ownKeys(descriptors);

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i] as string | symbol;

    if (isUnsafeKey(key)) {
      continue;
    }

    const descriptor: PropertyDescriptor = { ...descriptors[key] };

    if ('value' in descriptor) {
      descriptor.value = clone(descriptor.value, options, ref);
    }

    try {
      Object.defineProperty(result, key, descriptor);
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

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isPlainObject(value: unknown): value is PlainObject {
  return OBJECT_TO_STRING.call(value) === '[object Object]';
}

function isUnsafeKey(key: PropertyKey): boolean {
  return (
    typeof key === 'string' &&
    (key === '__proto__' || key === 'prototype' || key === 'constructor')
  );
}
