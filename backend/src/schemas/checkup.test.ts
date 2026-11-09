import { describe, expect, it } from 'vitest';
import { checkupSchema, isolateContractBody, mapZodIssuesToErrors } from './checkup';

const validPayload = {
  patientId: '550e8400-e29b-41d4-a716-446655440000',
  temperature: 36.6,
  pulse: 72,
  complaints: 'headache',
  hasInsurance: true,
};

describe('isolateContractBody', () => {
  it('returns a null-prototype object containing only the contract keys', () => {
    const result = isolateContractBody(validPayload);
    expect(result).toEqual(validPayload);
    expect(Object.getPrototypeOf(result)).toBeNull();
  });

  it('rejects a prototype-pollution attempt (__proto__ as an own key)', () => {
    // JSON.parse (same as Express's body-parser) makes "__proto__" a real own
    // key, unlike an object literal where it would just set the prototype.
    const body: unknown = JSON.parse(
      `${JSON.stringify(validPayload).slice(0, -1)},"__proto__":{"polluted":true}}`,
    );
    expect(isolateContractBody(body)).toBeNull();
  });

  it('rejects a body with any key outside the contract', () => {
    expect(isolateContractBody({ ...validPayload, role: 'admin' })).toBeNull();
  });

  it('rejects non-object and array bodies', () => {
    expect(isolateContractBody(null)).toBeNull();
    expect(isolateContractBody('string')).toBeNull();
    expect(isolateContractBody(42)).toBeNull();
    expect(isolateContractBody([validPayload])).toBeNull();
  });
});

describe('checkupSchema', () => {
  it('accepts a valid payload', () => {
    expect(checkupSchema.safeParse(validPayload).success).toBe(true);
  });

  it.each([false, null, [], '36.6', {}, undefined])(
    'rejects a falsy/non-number temperature instead of coercing it to 0: %j',
    (value) => {
      const result = checkupSchema.safeParse({ ...validPayload, temperature: value });
      expect(result.success).toBe(false);
    },
  );

  it.each([false, null, []])('rejects a falsy pulse instead of coercing it to 0: %j', (value) => {
    const result = checkupSchema.safeParse({ ...validPayload, pulse: value });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid UUID for patientId', () => {
    expect(checkupSchema.safeParse({ ...validPayload, patientId: 'not-a-uuid' }).success).toBe(
      false,
    );
  });

  it('rejects empty complaints', () => {
    expect(checkupSchema.safeParse({ ...validPayload, complaints: '' }).success).toBe(false);
  });

  it('rejects a non-boolean hasInsurance', () => {
    expect(checkupSchema.safeParse({ ...validPayload, hasInsurance: 'true' }).success).toBe(
      false,
    );
  });
});

describe('mapZodIssuesToErrors', () => {
  it('maps each field path to its own message, with no as cast', () => {
    const result = checkupSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = mapZodIssuesToErrors(result.error.issues);
    expect(errors.patientId).toBeDefined();
    expect(errors.temperature).toBe('temperature is required');
    expect(errors.pulse).toBe('pulse is required');
    expect(errors.complaints).toBeDefined();
    expect(errors.hasInsurance).toBeDefined();
  });
});
