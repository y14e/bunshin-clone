import { describe, expect, test } from 'bun:test';
import { bunshinClone } from '../src/index';

describe('bunshinClone', () => {
  test('primitive values: return as-is', () => {
    expect(bunshinClone(1)).toBe(1);
    expect(bunshinClone('a')).toBe('a');
    expect(bunshinClone(true)).toBe(true);
  });

  test('nullish', () => {
    expect(bunshinClone(null)).toBe(null);
    expect(bunshinClone(undefined)).toBe(undefined);
  });

  test('clone object', () => {
    const source = { a: 1 };
    const result = bunshinClone(source);

    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(source);
  });

  test('deep clone object', () => {
    const source = { a: { b: 1 } };
    const result = bunshinClone(source);

    expect(result).toEqual({ a: { b: 1 } });
    expect(result.a).not.toBe(source.a);
  });

  test('arrays', () => {
    const source = [1, 2, 3];
    const result = bunshinClone(source);

    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(source);
  });

  test('structural independence', () => {
    const source = { a: { b: 1 } };
    const result = bunshinClone(source);

    result.a.b = 2;
    expect(source.a.b).toBe(1);
  });

  test('circular reference', () => {
    const a: any = { x: 1 };
    a.self = a;

    const result = bunshinClone(a) as any;

    expect(result.x).toBe(1);
    expect(result.self).toBe(result);
  });

  test('Map', () => {
    const source = new Map([['a', { x: 1 }]]);
    const result = bunshinClone(source) as Map<any, any>;

    expect(result).not.toBe(source);
    expect(result.get('a')).toEqual({ x: 1 });
    expect(result.get('a')).not.toBe(source.get('a'));
  });

  test('Set', () => {
    const source = new Set([0, 1, 2, 3]);
    const result = bunshinClone(source) as Set<any>;

    expect(result).not.toBe(source);
    expect(result).toEqual(source);
  });

  test('Set with objects', () => {
    const source = new Set([{ a: 1 }]);
    const result = bunshinClone(source) as Set<any>;

    const [value] = result;
    const [original] = source;

    expect(result).not.toBe(source);
    expect(value).toEqual(original);
    expect(value).not.toBe(original);
  });

  test('Date', () => {
    const source = new Date();
    const result = bunshinClone(source) as Date;

    expect(result).not.toBe(source);
    expect(result.getTime()).toBe(source.getTime());
  });

  test('RegExp', () => {
    const source = /test/g;
    source.lastIndex = 2;

    const result = bunshinClone(source) as RegExp;

    expect(result).not.toBe(source);
    expect(result.source).toBe('test');
    expect(result.flags).toBe('g');
    expect(result.lastIndex).toBe(2);
  });

  test('ArrayBuffer', () => {
    const source = new ArrayBuffer(8);
    const result = bunshinClone(source) as ArrayBuffer;

    expect(result).not.toBe(source);
    expect(result.byteLength).toBe(8);
  });

  test('TypedArray', () => {
    const source = new Uint8Array([1, 2, 3]);
    const result = bunshinClone(source) as Uint8Array;

    expect(result).not.toBe(source);
    expect([...result]).toEqual([1, 2, 3]);
  });

  test('Error', () => {
    const source = new TypeError('fail');
    const result = bunshinClone(source) as Error;

    expect(result).not.toBe(source);
    expect(result.message).toBe('fail');
    expect(result.name).toBe('TypeError');
  });

  test('DOMException', () => {
    const source = new DOMException('fail', 'SyntaxError');
    const result = bunshinClone(source) as DOMException;

    expect(result).not.toBe(source);
    expect(result.message).toBe('fail');
    expect(result.name).toBe('SyntaxError');
  });

  test('AggregateError', () => {
    const err1 = new Error('error 1');
    const err2 = new TypeError('error 2');
    const source = new AggregateError(
      [err1, err2],
      'Multiple errors occurred',
      {
        cause: new Error('root cause'),
      },
    );
    (source as any).customProp = { detail: 'extra info' };

    const result = bunshinClone(source) as AggregateError & {
      customProp: { detail: string };
    };

    expect(result).not.toBe(source);
    expect(result).toBeInstanceOf(AggregateError);
    expect(result.message).toBe('Multiple errors occurred');
    expect(result.name).toBe('AggregateError');

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).not.toBe(err1);
    expect(result.errors[0].message).toBe('error 1');
    expect(result.errors[1]).not.toBe(err2);
    expect(result.errors[1].message).toBe('error 2');
    expect(result.errors[1].name).toBe('TypeError');

    expect(result.cause).not.toBe((source as any).cause);
    expect((result.cause as Error).message).toBe('root cause');

    expect(result.customProp).toEqual({ detail: 'extra info' });
    expect(result.customProp).not.toBe((source as any).customProp);
  });

  test('AggregateError with circular reference', () => {
    const err = new Error('inner error');
    const source = new AggregateError([err], 'Circular AggregateError');
    (source as any).self = source;

    const result = bunshinClone(source) as any;

    expect(result).not.toBe(source);
    expect(result.self).toBe(result);
    expect(result.errors[0]).not.toBe(err);
  });

  test('URL', () => {
    const source = new URL('https://example.com');
    const result = bunshinClone(source) as URL;

    expect(result).not.toBe(source);
    expect(result.href).toBe(source.href);
  });

  test('URLSearchParams', () => {
    const source = new URLSearchParams('a=1&a=2');
    const result = bunshinClone(source) as URLSearchParams;

    expect(result).not.toBe(source);
    expect(result.getAll('a')).toEqual(['1', '2']);
  });

  test('preserveDescriptors', () => {
    const source = {};
    Object.defineProperty(source, 'x', {
      enumerable: true,
      get: () => 42,
    });

    const result = bunshinClone(source, { preserveDescriptors: true });

    expect(result.x).toBe(42);
    expect(Object.getOwnPropertyDescriptor(result, 'x')?.get).toBeDefined();
  });

  test('preserveDescriptors: accessor descriptor without value is preserved', () => {
    const getter = () => ({ nested: 1 });
    const source = {};
    Object.defineProperty(source, 'x', {
      configurable: true,
      enumerable: true,
      get: getter,
    });

    const result = bunshinClone(source, { preserveDescriptors: true });
    const desc = Object.getOwnPropertyDescriptor(result, 'x');

    expect(desc).toBeDefined();
    if (!desc) {
      throw new Error('Expected descriptor');
    }
    expect('value' in desc).toBe(false);
    expect(desc.get).toBe(getter);
  });

  /* --- Symbol キー関連のテスト (デフォルト false / 明示的 true) --- */

  test('symbol-keyed property is excluded by default (preserveSymbolKeys: false)', () => {
    const sym = Symbol('k');
    const source = { [sym]: { nested: 1 }, normal: 'x' };

    const result = bunshinClone(source);

    expect(result.normal).toBe('x');
    expect(Object.hasOwn(result, sym)).toBe(false);
  });

  test('preserveSymbolKeys: true clones enumerable symbol-keyed properties', () => {
    const sym = Symbol('k');
    const source = { [sym]: { nested: 1 }, normal: 'x' };

    const result = bunshinClone(source, { preserveSymbolKeys: true });

    expect(result.normal).toBe('x');
    expect(result[sym]).toEqual({ nested: 1 });
    expect(result[sym]).not.toBe(source[sym]);
  });

  test('non-enumerable symbol-keyed property is excluded even when preserveSymbolKeys: true', () => {
    const sym = Symbol('hidden');
    const source = {};
    Object.defineProperty(source, sym, {
      enumerable: false,
      value: 'secret',
    });

    const result = bunshinClone(source, { preserveSymbolKeys: true });

    expect(Object.hasOwn(result, sym)).toBe(false);
  });

  /* --- 非可挙プロパティ / ガードのテスト --- */

  test('non-enumerable string property is excluded by default', () => {
    const source = {};
    Object.defineProperty(source, 'hidden', {
      configurable: true,
      enumerable: false,
      value: 42,
      writable: true,
    });

    const result = bunshinClone(source) as any;

    expect(Object.hasOwn(result, 'hidden')).toBe(false);
  });

  test('non-enumerable getter is excluded by default (does not get flattened)', () => {
    const source = {};
    Object.defineProperty(source, 'computed', {
      configurable: true,
      enumerable: false,
      get: () => 'computed-value',
    });

    const result = bunshinClone(source) as any;

    expect(Object.hasOwn(result, 'computed')).toBe(false);
  });

  test('enumerable getter is still flattened to a plain value by default', () => {
    const source = {
      get computed() {
        return 'computed-value';
      },
    };

    const result = bunshinClone(source) as any;
    const desc = Object.getOwnPropertyDescriptor(result, 'computed');

    expect(result.computed).toBe('computed-value');
    expect(desc?.get).toBeUndefined();
  });

  test('preserveDescriptors: true still preserves non-enumerable properties', () => {
    const source = {};
    Object.defineProperty(source, 'hidden', {
      configurable: true,
      enumerable: false,
      value: 42,
      writable: true,
    });

    const result = bunshinClone(source, { preserveDescriptors: true }) as any;
    const desc = Object.getOwnPropertyDescriptor(result, 'hidden');

    expect(desc?.value).toBe(42);
    expect(desc?.enumerable).toBe(false);
  });

  test('__proto__ key is skipped (prototype pollution guard)', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');

    const result = bunshinClone(malicious) as any;

    expect(({} as any).polluted).toBeUndefined();
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
  });

  test('unsupported types: return as-is', () => {
    const fn = () => {};
    const result = bunshinClone(fn);

    expect(result).toBe(fn);
  });
});

describe('bunshinClone - Edge Cases', () => {
  /* --- 1. 特殊なプリミティブ / JavaScript 組み込みオブジェクト --- */

  test('special primitives (NaN, Infinity, -0, BigInt, Symbol)', () => {
    expect(Number.isNaN(bunshinClone(NaN))).toBe(true);
    expect(bunshinClone(Infinity)).toBe(Infinity);
    expect(bunshinClone(-Infinity)).toBe(-Infinity);
    expect(Object.is(bunshinClone(-0), -0)).toBe(true);
    expect(bunshinClone(123n)).toBe(123n);

    const sym = Symbol('unique');
    expect(bunshinClone(sym)).toBe(sym);
  });

  test('sparse array (empty slots)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const source = [1, , 3];
    const result = bunshinClone(source);

    expect(result).toEqual([1, undefined, 3]);
    expect(0 in result).toBe(true);
    // cloneArray は .map を使うため、空きスロットは undefined に埋められて密な配列になります
    expect(result.length).toBe(3);
  });

  /* --- 2. Set / Map のエッジケース --- */

  test('Set: mixture of primitives and objects', () => {
    const obj = { key: 'value' };
    const source = new Set<any>([1, 'a', obj]);
    const result = bunshinClone(source);

    expect(result).not.toBe(source);
    expect(result.size).toBe(3);

    // オブジェクト要素のみ参照が分離されているか検証
    const resultItems = [...result];
    expect(resultItems[0]).toBe(1);
    expect(resultItems[1]).toBe('a');
    expect(resultItems[2]).toEqual(obj);
    expect(resultItems[2]).not.toBe(obj);
  });

  test('Set / Map: self-referential (circular dependency)', () => {
    const setSource = new Set<any>();
    setSource.add(setSource);

    const setResult = bunshinClone(setSource);
    expect(setResult).not.toBe(setSource);
    expect(setResult.has(setResult)).toBe(true);

    const mapSource = new Map<any, any>();
    mapSource.set(mapSource, mapSource);

    const mapResult = bunshinClone(mapSource);
    expect(mapResult).not.toBe(mapSource);
    expect(mapResult.get(mapResult)).toBe(mapResult);
  });

  test('Map: primitive keys and object keys', () => {
    const keyObj = { id: 1 };
    const valObj = { name: 'test' };
    const source = new Map<any, any>([
      ['strKey', valObj],
      [keyObj, 'strVal'],
    ]);

    const result = bunshinClone(source);
    expect(result).not.toBe(source);

    // キーがオブジェクトの場合、キー自体もクローンされて参照が変わる
    const clonedKeyObj = [...result.keys()].find((k) => typeof k === 'object');
    expect(clonedKeyObj).toEqual(keyObj);
    expect(clonedKeyObj).not.toBe(keyObj);
    expect(result.get(clonedKeyObj)).toBe('strVal');
  });

  /* --- 3. プロトタイプ継承・特殊オブジェクト --- */

  test('custom class instances are treated as unsupported and returned as-is', () => {
    class CustomClass {
      foo = 'bar';
    }

    const source = new CustomClass();
    const result = bunshinClone(source);

    // isPlainObject ではないため、クローンされずそのまま返されるのが正しい仕様
    expect(result).toBe(source);
  });

  test('Object.create(null) - objects without prototype', () => {
    const source = Object.create(null);
    source.a = { b: 1 };

    const result = bunshinClone(source);

    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(result.a).toEqual({ b: 1 });
    expect(result.a).not.toBe(source.a);
  });

  /* --- 4. TypedArray / ArrayBufferView のメモリ共有オプション --- */

  test('TypedArray with preserveBufferSharing: true', () => {
    const buffer = new ArrayBuffer(16);
    const view1 = new Int32Array(buffer, 0, 2);
    const view2 = new Int32Array(buffer, 8, 2);

    const source = { view1, view2 };
    const result = bunshinClone(source, { preserveBufferSharing: true });

    expect(result.view1.buffer).toBe(result.view2.buffer);
    expect(result.view1.buffer).not.toBe(buffer);
  });

  /* --- 5. エラーオブジェクト (Error) の特殊プロパティ・cause --- */

  test('Error with cause and custom nested properties', () => {
    const causeErr = new Error('cause error');
    const source = new Error('main error', { cause: causeErr });
    (source as any).extra = { nested: true };

    const result = bunshinClone(source) as any;

    expect(result).not.toBe(source);
    expect(result.message).toBe('main error');
    expect(result.cause).not.toBe(causeErr);
    expect(result.cause.message).toBe('cause error');
    expect(result.extra).toEqual({ nested: true });
    expect(result.extra).not.toBe((source as any).extra);
  });

  /* --- 6. セキュリティ / 不正なオプションフォールバック --- */

  test('invalid options fallback gracefully', () => {
    // 開発時に型を無視して不正な値を渡された場合の判定ログ・フォールバック検証
    const source = { a: 1 };
    const result = bunshinClone(source, {
      preserveDescriptors: 'invalid' as any,
    });

    expect(result).toEqual({ a: 1 });
  });

  test('prototype pollution security test (constructor, prototype, __proto__)', () => {
    const source = JSON.parse(
      '{"constructor": {"prototype": {"polluted": true}}}',
    );

    const result = bunshinClone(source);

    expect(({} as any).polluted).toBeUndefined();
    expect(result.constructor).not.toBe(source.constructor);
  });
});
