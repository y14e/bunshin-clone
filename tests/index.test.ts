import { describe, expect, test } from 'bun:test';
import bunshinClone from '../src/index';

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
    const source = new Set([{ x: 1 }]);
    const result = bunshinClone(source) as Set<any>;

    const [value] = result;
    const [original] = source;

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
      get: () => 42,
      enumerable: true,
    });

    const result = bunshinClone(source, { preserveDescriptors: true });

    expect(result.x).toBe(42);
    expect(Object.getOwnPropertyDescriptor(result, 'x')?.get).toBeDefined();
  });

  test('unsupported types: return as-is', () => {
    const fn = () => {};
    const result = bunshinClone(fn);

    expect(result).toBe(fn);
  });
});
