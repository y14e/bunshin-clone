import type { Refs } from '@/ref';

export function cloneDate(date: Date, refs: Refs): Date {
  const result = new Date(date.getTime());
  refs.set(date, result); // [Refs]
  return result;
}
