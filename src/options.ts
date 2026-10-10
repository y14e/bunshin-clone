import type { BunshinCloneOptions as Options } from '@/types';

export function resolveOptions(options: Partial<Options>): Options {
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
