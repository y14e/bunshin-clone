import type { TypedArray } from 'type-fest';

export interface BunshinCloneOptions {
  preserveBufferSharing: boolean;
  preserveDescriptors: boolean;
  preserveSymbolKeys: boolean;
}

export type ArrayBufferView_ = DataView | TypedArray;

export type PlainObject = Record<PropertyKey, unknown>;
