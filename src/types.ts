import type { TypedArray } from 'type-fest';

export interface Options {
  preserveBufferSharing: boolean;
  preserveDescriptors: boolean;
  preserveSymbolKeys: boolean;
}

export type ArrayBufferView_ = DataView | TypedArray;

export type PlainObject = Record<PropertyKey, unknown>;
