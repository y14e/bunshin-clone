import type { Refs } from '@/ref';

export function cloneImageData(data: ImageData, refs: Refs): ImageData {
  const { data: d, width, height, colorSpace } = data;
  const result = new ImageData(new Uint8ClampedArray(d), width, height, {
    colorSpace,
  });
  refs.set(data, result); // [Refs]
  return result;
}
