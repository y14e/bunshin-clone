import type { TypedArray } from 'type-fest';
import type { Refs } from '@/ref';
import type { ArrayBufferView_, BunshinCloneOptions as Options } from '@/types';

export function cloneArrayBufferView(
  view: ArrayBufferView_,
  settings: Options,
  refs: Refs,
): ArrayBufferView_ {
  // DataView
  if (view instanceof DataView) {
    const { buffer, byteOffset, byteLength } = view;
    const result = new DataView(
      cloneBuffer(buffer, refs),
      byteOffset,
      byteLength,
    );
    refs.set(view, result); // [Refs]
    return result;
  }

  // TypedArray

  // Do not preserve buffer sharing; faster (default)
  if (!settings.preserveBufferSharing) {
    const Ctor = view.constructor as new (_: TypedArray) => TypedArray;
    const result = new Ctor(view);
    refs.set(view, result); // [Refs]
    return result;
  }

  // Preserve buffer sharing; slower (optional)
  const Ctor = view.constructor as new (
    buffer: ArrayBufferLike,
    byteOffset: number,
    length: number,
  ) => TypedArray;
  const { buffer, byteOffset, length } = view;
  const result = new Ctor(cloneBuffer(buffer, refs), byteOffset, length);
  refs.set(view, result); // [Refs]
  return result;
}

function cloneBuffer(buffer: ArrayBufferLike, refs: Refs): ArrayBufferLike {
  if (refs.has(buffer)) {
    return refs.get(buffer) as ArrayBufferLike;
  }

  const result = buffer.slice(0);
  refs.set(buffer, result); // [Refs]
  return result;
}
