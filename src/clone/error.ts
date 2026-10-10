import { clone } from '@/index';
import type { Refs } from '@/ref';
import type { BunshinCloneOptions as Options } from '@/types';

type Error_ = DOMException | Error;

export function cloneError(error: Error, settings: Options, refs: Refs): Error {
  const result = createErrorInstance(error, settings, refs);
  refs.set(error, result); // [Refs]

  // DOMException
  if (error instanceof DOMException) {
    return result;
  }

  // Others
  const { stack, cause } = error;

  if (stack) {
    try {
      result.stack = stack;
    } catch {}
  }

  if ('cause' in error && cause !== undefined) {
    result.cause = clone(cause, settings, refs);
  }

  for (const key of Object.keys(error)) {
    Reflect.set(result, key, clone(Reflect.get(error, key), settings, refs));
  }

  return result;
}

const ERROR_CTORS: Record<string, new (message?: string) => Error> = {
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
};

function createErrorInstance(
  error: Error_,
  settings: Options,
  refs: Refs,
): Error_ {
  const { message, name } = error;

  // DOMException
  if (error instanceof DOMException) {
    return new DOMException(message, name);
  }

  // AggregateError
  if (error instanceof AggregateError) {
    return new AggregateError(
      error.errors.map((e) => clone(e, settings, refs)),
      message,
    );
  }

  // Other standard built-in errors
  const Ctor = ERROR_CTORS[name];

  if (Ctor) {
    return new Ctor(message);
  }

  // Unknown error types
  const result = new Error(message);
  result.name = name;
  return result;
}
