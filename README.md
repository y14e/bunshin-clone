# Bunshin Clone

High-performance deep clone utility with descriptor support. Supports circular references and complex built-in types.

* Fast (no unnecessary overhead)
* Deep clone (no structural sharing)
* Supports circular ref
* Handles Map, Set, Array, TypedArray, Date, RegExp, etc.
* Optional descriptor preservation

---

## Install

```bash
npm i bunshin-clone
```

```ts
// npm
import bunshinClone from 'bunshin-clone';

// CDNs
import bunshinClone from 'https://esm.sh/bunshin-clone'
// or
import bunshinClone from 'https://cdn.jsdelivr.net/npm/bunshin-clone/+esm';
// or
import bunshinClone from 'https://unpkg.com/bunshin-clone/dist/index.js';
```

## Usage

```ts
import bunshinClone from 'bunshin-clone';

const source = { foo: 1, nested: { x: 1 } };

const result = bunshinClone(source);

console.log(result);
// { foo: 1, nested: { x: 1 } }

console.log(result === source); // false
console.log(result.nested === source.nested); // false
```

## API

```ts
bunshinClone(target)
bunshinClone(target, options)
```

## Options

```ts
BunshinCloneOptions {
  preserveDescriptors: false;
  strictDescriptors: false;
}
```

**preserveDescriptors**

* `false`: use standard merge (faster, ignores property descriptors)
* `true`: preserve property descriptors (getters/setters, etc.)

<details>
<summary>Example</summary>

```ts
const source = {};
Object.defineProperty(source, 'x', {
  get: () => 42,
  enumerable: true,
});

const result = bunshinClone(source, { preserveDescriptors: true });

Object.getOwnPropertyDescriptor(result, 'x')?.get;
// => function
```
</details>

**strictDescriptors**

* `false`: skip incompatible descriptors
* `true`: throw if descriptor cannot be merged (e.g. non-configurable or non-writable)

<details>
<summary>Example</summary>

```ts
Object.freeze(obj);

bunshinClone(obj, { strictDescriptors: true });
// => may throw TypeError
```
</details>

---

## Supported Types

bunshin-clone correctly handles:

* Object (plain + prototype preserved)
* Array
* Map
* Set
* Date
* RegExp
* ArrayBuffer
* DataView
* TypedArray (Uint8Array, etc.)
* Error / DOMException
* Blob
* ImageData
* URL
* URLSearchParams

## Circular ref

```ts
const a: any = { x: 1 };
a.self = a;

const result = bunshinClone(a);

result.self === result; // true
```

## Descriptor Behavior

### Default (fast path)

```ts
const source = {
  get x() {
    return 42;
  }
};

const result = bunshinClone(source);

result.x; // 42
// getter is NOT preserved
```

### preserveDescriptors: true

```ts
const source = {};
Object.defineProperty(source, 'x', {
  get: () => 42,
  enumerable: true,
});

const result = bunshinClone(source, {
  preserveDescriptors: true,
});

Object.getOwnPropertyDescriptor(result, 'x')?.get;
// => preserved
```

### Unsupported / Pass-through Types

Some values are returned as-is:

* Function
* WeakMap / WeakSet
* Proxy (not cloned)
* Other non-cloneable host objects

```ts
const fn = () => {};

bunshinClone(fn) === fn; // true
```

## Design Notes

### Deep clone (no structural sharing)

Unlike merge utilities, bunshin-clone always produces a new structure:

```ts
const source = { a: { b: 1 } };

const result = bunshinClone(source);

result !== source; // true
result.a !== source.a; // true
```

### Getter / Setter behavior

* Default: evaluated and converted to value
* preserveDescriptors: preserved as-is

### Descriptor safety

When `preserveDescriptors` is enabled:

* descriptors are cloned safely
* original object is never mutated
* errors are controlled via `strictDescriptors`

## Performance

* No proxy / no diffing
* Minimal branching
* Fast path for plain objects and arrays
* Competitive with structuredClone in many cases

## Comparison

| Feature              | Bunshin Clone | structuredClone | lodash.clonedeep |
|---------------------|--------------|----------------|------------------|
| Circular refs       | ✅           | ✅             | ✅               |
| Map / Set           | ✅           | ✅             | ⚠️ (partial)     |
| TypedArray          | ✅           | ✅             | ⚠️ (shallow)     |
| Descriptor support  | ✅           | ❌             | ❌               |
| Functions           | pass-through | ❌ (throws)    | pass-through     |
| Prototype preserved | ✅           | ❌             | ⚠️               |
| Custom control      | ✅           | ❌             | ❌               |
| Performance         | ⚡ fast       | ⚡ fast         | 🐢 slower        |
