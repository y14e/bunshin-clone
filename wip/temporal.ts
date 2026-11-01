import type { Refs } from '../ref';

export function cloneTemporal(temporal: Temporal.Instant, refs: Refs): Temporal.Instant {
  const result = new Temporal.Instant(temporal.epochNanoseconds);
  refs.set(temporal, result); // [Refs]
  return result;
}
