import { z } from 'zod';

type ContractKey = 'patientId' | 'temperature' | 'pulse' | 'complaints' | 'hasInsurance';

const CONTRACT_KEYS: ContractKey[] = ['patientId', 'temperature', 'pulse', 'complaints', 'hasInsurance'];
const CONTRACT_KEY_SET = new Set<string>(CONTRACT_KEYS);

function isContractKey(key: string): key is ContractKey {
  return CONTRACT_KEY_SET.has(key);
}

function createNullPrototypeObject<T extends object>(): T {
  return Object.create(null);
}

export function isolateContractBody(body: unknown): Record<ContractKey, unknown> | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  const sourceKeys = Object.keys(body);
  if (sourceKeys.some((key) => !isContractKey(key))) {
    return null;
  }

  const isolated = createNullPrototypeObject<Record<ContractKey, unknown>>();
  return Object.assign(isolated, body);
}

function strictNumber(fieldLabel: string) {
  return z.preprocess((value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    return undefined;
  }, z.number({ invalid_type_error: `${fieldLabel} must be a number`, required_error: `${fieldLabel} is required` }));
}

export const checkupSchema = z.object({
  patientId: z.string().uuid('patientId must be a valid UUID'),
  temperature: strictNumber('temperature'),
  pulse: strictNumber('pulse'),
  complaints: z.string().min(1, 'complaints is required'),
  hasInsurance: z.boolean({ invalid_type_error: 'hasInsurance must be a boolean' }),
});

export type CheckupPayload = z.infer<typeof checkupSchema>;

export function mapZodIssuesToErrors(issues: z.ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string') {
      errors[key] = issue.message;
    }
  }
  return errors;
}
