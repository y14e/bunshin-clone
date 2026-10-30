import type { Refs } from '../ref';

export function cloneImageData(image: ImageData, refs: Refs): ImageData {
  const { data, width, height, colorSpace } = image;
  const result = new ImageData(new Uint8ClampedArray(data), width, height, { colorSpace });
  refs.set(image, result); // [Refs]
  return result;
}
