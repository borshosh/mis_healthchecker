import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

const app = createApp();

const validPayload = {
  patientId: '550e8400-e29b-41d4-a716-446655440000',
  temperature: 36.6,
  pulse: 72,
  complaints: 'headache',
  hasInsurance: true,
};

describe('POST /api/v1/patients/checkup', () => {
  it('accepts a valid payload', async () => {
    const res = await request(app).post('/api/v1/patients/checkup').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rejects falsy numeric triggers with a field error map instead of coercing to 0', async () => {
    const res = await request(app)
      .post('/api/v1/patients/checkup')
      .send({ ...validPayload, temperature: false, pulse: null });
    expect(res.status).toBe(400);
    expect(res.body.errors.temperature).toBeDefined();
    expect(res.body.errors.pulse).toBeDefined();
  });

  it('rejects a body with an unexpected key (prototype-pollution guard)', async () => {
    const res = await request(app)
      .post('/api/v1/patients/checkup')
      .send({ ...validPayload, role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeUndefined();
    expect(typeof res.body.error).toBe('string');
  });

  it('rejects an invalid patientId', async () => {
    const res = await request(app)
      .post('/api/v1/patients/checkup')
      .send({ ...validPayload, patientId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.errors.patientId).toBeDefined();
  });

  it('simulates a transaction failure when complaints contains throw_error', async () => {
    const res = await request(app)
      .post('/api/v1/patients/checkup')
      .send({ ...validPayload, complaints: 'please throw_error now' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Сбой транзакции МИС' });
  });

  it('rejects bodies larger than the 100kb limit with 413', async () => {
    const res = await request(app)
      .post('/api/v1/patients/checkup')
      .send({ ...validPayload, complaints: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Payload Too Large' });
  });
});
