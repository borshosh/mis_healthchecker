import { describe, expect, it } from 'vitest';
import { isPayloadTooLargeError } from './httpErrors';

describe('isPayloadTooLargeError', () => {
  it('recognizes the body-parser "entity.too.large" error shape', () => {
    expect(isPayloadTooLargeError({ type: 'entity.too.large', status: 413 })).toBe(true);
  });

  it('rejects other error shapes', () => {
    expect(isPayloadTooLargeError({ type: 'entity.parse.failed' })).toBe(false);
    expect(isPayloadTooLargeError(new Error('boom'))).toBe(false);
    expect(isPayloadTooLargeError(null)).toBe(false);
    expect(isPayloadTooLargeError(undefined)).toBe(false);
    expect(isPayloadTooLargeError('oops')).toBe(false);
    expect(isPayloadTooLargeError(42)).toBe(false);
  });
});
