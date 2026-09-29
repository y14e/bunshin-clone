import { bunshinClone } from 'bunshin-clone-npm';
import cloneDeep from 'lodash.clonedeep';
import { Bench } from 'tinybench';
import { bunshinClone as bunshinCloneDev } from '../dist/index.js';

let sink: unknown;

// ----------------------------------------
// Output
// ----------------------------------------

function print(bench: Bench): void {
  console.table(
    bench.tasks.map((task) => {
      const { result } = task;

      if (
        result.state !== 'completed' &&
        result.state !== 'aborted-with-statistics'
      ) {
        return {
          name: task.name,
          'ops/sec': 'FAILED',
          '±%': '-',
        };
      }

      return {
        name: task.name,
        'ops/sec': Math.round(result.throughput.mean).toLocaleString(),
        '±%': result.throughput.rme.toFixed(2),
      };
    }),
  );
}

// ----------------------------------------
// Common benchmark
// ----------------------------------------

async function run(name: string, value: unknown): Promise<void> {
  console.log(`\n=== ${name} ===`);

  const bench = new Bench({
    time: 100,
    warmupTime: 100,
  });

  bench
    .add('bunshin-clone (dev)', () => {
      sink = bunshinCloneDev(value);
    })
    .add('bunshin-clone', () => {
      sink = bunshinClone(value);
    })
    .add('structuredClone', () => {
      sink = structuredClone(value);
    })
    .add('lodash.clonedeep', () => {
      sink = cloneDeep(value);
    });

  await bench.run();

  print(bench);
}

// ----------------------------------------
// Circular reference
// ----------------------------------------

async function runCircular(name: string, value: unknown): Promise<void> {
  console.log(`\n=== ${name} ===`);

  const bench = new Bench({
    time: 100,
    warmupTime: 100,
  });

  bench
    .add('bunshin-clone (dev)', () => {
      sink = bunshinCloneDev(value);
    })
    .add('bunshin-clone', () => {
      sink = bunshinClone(value);
    })
    .add('structuredClone', () => {
      sink = structuredClone(value);
    })
    .add('lodash.clonedeep', () => {
      sink = cloneDeep(value);
    });

  await bench.run();

  print(bench);
}

// ----------------------------------------
// bunshin-clone options
// ----------------------------------------

async function runDescriptors(name: string, value: unknown): Promise<void> {
  console.log(`\n=== ${name} ===`);

  const bench = new Bench({
    time: 100,
    warmupTime: 100,
  });

  bench
    .add('bunshin-clone (dev): default', () => {
      sink = bunshinCloneDev(value);
    })
    .add('bunshin-clone: default', () => {
      sink = bunshinClone(value);
    })
    .add('bunshin-clone (dev): descriptors', () => {
      sink = bunshinCloneDev(value, {
        preserveDescriptors: true,
      });
    })
    .add('bunshin-clone: descriptors', () => {
      sink = bunshinClone(value, {
        preserveDescriptors: true,
      });
    });

  await bench.run();

  print(bench);
}

async function runBufferSharing(name: string, value: unknown): Promise<void> {
  console.log(`\n=== ${name} ===`);

  const bench = new Bench({
    time: 100,
    warmupTime: 100,
  });

  bench
    .add('bunshin-clone (dev): default', () => {
      sink = bunshinCloneDev(value);
    })
    .add('bunshin-clone: default', () => {
      sink = bunshinClone(value);
    })
    .add('bunshin-clone (dev): preserveBufferSharing', () => {
      sink = bunshinCloneDev(value, {
        preserveBufferSharing: true,
      });
    })
    .add('bunshin-clone: preserveBufferSharing', () => {
      sink = bunshinClone(value, {
        preserveBufferSharing: true,
      });
    })
    .add('structuredClone', () => {
      sink = structuredClone(value);
    });

  await bench.run();

  print(bench);
}

// ----------------------------------------
// Data
// ----------------------------------------

// Small object
const small = {
  active: true,
  id: 1,
  name: 'foo',
  nested: {
    x: 10,
    y: 20,
  },
};

// Deeply nested object
const nested = {
  a: {
    b: {
      c: {
        d: {
          e: {
            f: {
              value: 42,
            },
          },
        },
      },
    },
  },
};

// Wide object
const wide = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [
    `key${i}`,
    {
      id: i,
      value: `value-${i}`,
    },
  ]),
);

// Large object
const large = Object.fromEntries(
  Array.from({ length: 500 }, (_, i) => [
    `key${i}`,
    {
      id: i,
      meta: {
        active: i % 2 === 0,
        score: i * 0.5,
      },
      name: `item-${i}`,
      values: [i, i + 1, i + 2],
    },
  ]),
);

// Primitive array
const primitiveArray = Array.from({ length: 500 }, (_, i) => i);

// Object array
const objectArray = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  name: `item-${i}`,
  nested: {
    x: i,
    y: i + 1,
  },
}));

// Mixed array
const mixedArray = Array.from({ length: 250 }, (_, i) => [
  i,
  `item-${i}`,
  {
    id: i,
    values: [i, i + 1, i + 2],
  },
]);

// Map
const map = new Map(
  Array.from({ length: 50 }, (_, i) => [
    `key${i}`,
    {
      id: i,
      nested: {
        value: i,
      },
    },
  ]),
);

// Set
const set = new Set(
  Array.from({ length: 50 }, (_, i) => ({
    id: i,
    value: `value-${i}`,
  })),
);

// Date + RegExp
const builtins = {
  date: new Date('2026-01-01T00:00:00.000Z'),
  params: new URLSearchParams({
    baz: 'qux',
    foo: 'bar',
  }),
  regexp: /benchmark/giu,
  url: new URL('https://example.com/foo?bar=baz'),
};

// TypedArray
const typedArray = new Float64Array(
  Array.from({ length: 1000 }, (_, i) => i * 0.5),
);

// Shared ArrayBuffer
const sharedBuffer = new ArrayBuffer(8 * 1000);

const sharedViews = {
  a: new Float64Array(sharedBuffer, 0, 500),
  b: new Float64Array(sharedBuffer, 8 * 500, 500),
};

// Circular
interface CircularObject {
  child?: CircularObject;
  id: number;
  name: string;
  self?: CircularObject;
}

const circular: CircularObject = {
  id: 1,
  name: 'root',
};

circular.child = {
  id: 2,
  name: 'child',
};

circular.self = circular;
circular.child.self = circular;

// Descriptor
const descriptorObject = Object.create(null) as Record<string, unknown>;

for (let i = 0; i < 100; i++) {
  Object.defineProperty(descriptorObject, `key${i}`, {
    configurable: false,
    enumerable: i % 2 === 0,
    value: {
      id: i,
      nested: {
        value: i,
      },
    },
    writable: false,
  });
}

// ----------------------------------------
// Run
// ----------------------------------------

async function main(): Promise<void> {
  // JSON-like structures
  await run('small object', small);
  await run('deeply nested object', nested);
  await run('wide object (100 properties)', wide);
  await run('large object (1000 properties)', large);

  // Arrays
  await run('primitive array (500)', primitiveArray);
  await run('object array (500)', objectArray);
  await run('mixed nested array (250)', mixedArray);

  // Built-ins
  await run('Map (50)', map);
  await run('Set (50)', set);
  await run('Date / RegExp / URL / URLSearchParams', builtins);
  await run('Float64Array (1000)', typedArray);

  // References
  await runCircular('circular reference', circular);

  // bunshin-specific options
  await runBufferSharing('shared ArrayBuffer', sharedViews);
  await runDescriptors('property descriptors', descriptorObject);

  // Prevent sink from being considered entirely unused.
  void sink;
}

await main();
