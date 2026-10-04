# Bunshin Clone

High-performance deep clone utility with descriptor support. Handles circular ref and complex built-in types.

## Install

```bash
npm i bunshin-clone
```

```ts
// npm
import { bunshinClone } from 'bunshin-clone';

// CDNs
import { bunshinClone } from 'https://esm.sh/bunshin-clone@<x.x.x>';
// or
import { bunshinClone } from 'https://cdn.jsdelivr.net/npm/bunshin-clone@<x.x.x>/+esm';
// or
import { bunshinClone } from 'https://esm.unpkg.com/bunshin-clone@<x.x.x>';
```

## 📦 APIs

```ts
bunshinClone<T>(value, options);
// => T
//
// value: T
// options (optional): BunshinCloneOptions
```

## 🪄 Options

```ts
interface BunshinCloneOptions {
  preserveBufferSharing: boolean; // default: false
  preserveDescriptors: boolean;   // default: false
  preserveSymbolKeys: boolean;    // default: false
}
```

### `preserveBufferSharing`

If `true`, preserves shared backing buffers between TypedArray and DataView instances.

### `preserveDescriptors`

If `true`, preserves property descriptors, including non-enumerable properties.

### `preserveSymbolKeys`

If `true`, preserves symbol keys (slower).
