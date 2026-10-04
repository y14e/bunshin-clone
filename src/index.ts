import { cloneArray, isPrimitiveArray } from '@/clone/array';
import { cloneArrayBuffer } from '@/clone/array-buffer';
import { cloneArrayBufferView } from '@/clone/array-buffer-view';
import { cloneBlob } from '@/clone/blob';
import { cloneDate } from '@/clone/date';
import { cloneError } from '@/clone/error';
import { cloneImageData } from '@/clone/image-data';
import { cloneMap } from '@/clone/map';
import { clonePlainObject } from '@/clone/plain-object';
import { cloneRegExp } from '@/clone/regexp';
import { cloneSet } from '@/clone/set';
import { cloneURL } from '@/clone/url';
import { cloneURLSearchParams } from '@/clone/url-search-params';
import { cloneWithDescriptors } from '@/clone/with-descriptors';
import type { Refs } from '@/ref';
import type {
  ArrayBufferView_,
  BunshinCloneOptions,
  PlainObject,
} from '@/types';
import { isObject, isPlainObject } from '@/utils';

export function bunshinClone<T>(
  value: T,
  options: Partial<BunshinCloneOptions> = {},
): T {
  return clone(value, resolveOptions(options), new WeakMap());
}

export function clone<T>(
  value: T,
  settings: BunshinCloneOptions,
  refs: Refs,
): T {
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
    return cloneDate(value, refs) as T;
  }

  // RegExp
  if (value instanceof RegExp) {
    return cloneRegExp(value, refs) as T;
  }

  // ArrayBuffer
  if (value instanceof ArrayBuffer) {
    return cloneArrayBuffer(value, refs) as T;
  }

  // ArrayBuffer view (DataView/TypedArray)
  if (ArrayBuffer.isView(value)) {
    return cloneArrayBufferView(
      value as unknown as ArrayBufferView_,
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
    return cloneBlob(value, refs) as T;
  }

  // ImageData
  if (typeof ImageData !== 'undefined' && value instanceof ImageData) {
    return cloneImageData(value, refs) as T;
  }

  // URL
  if (value instanceof URL) {
    return cloneURL(value, refs) as T;
  }

  // URLSearchParams
  if (value instanceof URLSearchParams) {
    return cloneURLSearchParams(value, refs) as T;
  }

  // Unsupported types: return as-is
  refs.set(value, value); // [Refs]
  return value;
}

function resolveOptions(
  options: Partial<BunshinCloneOptions>,
): BunshinCloneOptions {
  let {
    preserveBufferSharing = false,
    preserveDescriptors = false,
    preserveSymbolKeys = false,
  } = options;

  if (typeof preserveBufferSharing !== 'boolean') {
    console.warn('Invalid preserveBufferSharing option. Fallback: false.');
    preserveBufferSharing = false;
  }

  if (typeof preserveDescriptors !== 'boolean') {
    console.warn('Invalid preserveDescriptors option. Fallback: false.');
    preserveDescriptors = false;
  }

  if (typeof preserveSymbolKeys !== 'boolean') {
    console.warn('Invalid preserveSymbolKeys option. Fallback: false.');
    preserveSymbolKeys = false;
  }

  return {
    preserveBufferSharing,
    preserveDescriptors,
    preserveSymbolKeys,
  };
}

export {
  type BunshinCloneOptions,
  isObject,
  isPlainObject,
  isPrimitiveArray,
  type PlainObject,
};
