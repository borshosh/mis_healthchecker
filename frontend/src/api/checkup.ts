import axios from 'axios';
import type { CheckupPayload } from '../../../backend/src/schemas/checkup';

export class ValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super('Validation failed');
  }
}

export class ServerError extends Error {}

export async function submitCheckup(payload: Partial<CheckupPayload>): Promise<void> {
  try {
    await axios.post('/api/v1/patients/checkup', payload);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      if (err.response.status === 400) {
        throw new ValidationError(extractErrorMap(err.response.data));
      }
      throw new ServerError(extractErrorMessage(err.response.data));
    }
    throw new ServerError('Backend is unavailable');
  }
}

function extractErrorMap(data: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof data !== 'object' || data === null || !('errors' in data)) {
    return result;
  }
  const { errors } = data;
  if (typeof errors !== 'object' || errors === null) {
    return result;
  }
  for (const [key, value] of Object.entries(errors)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

function extractErrorMessage(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const { error } = data;
    if (typeof error === 'string') {
      return error;
    }
  }
  return 'Unexpected error';
}
