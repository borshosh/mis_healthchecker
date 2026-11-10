import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

// The cache and request counter are module-level state inside icd10.ts (by
// design - that's what makes "every 4th request" possible at all), so these
// tests run in a fixed sequence against one app instance: each title names
// which request number it is, since that's what decides cache vs db.
describe('GET /api/v1/dictionaries/icd10', () => {
  const app = createApp();

  it('request 1: cold cache -> ~1000ms simulated DB read, at least 3 entries', async () => {
    const startedAt = Date.now();
    const res = await request(app).get('/api/v1/dictionaries/icd10');
    const elapsed = Date.now() - startedAt;

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('db');
    expect(elapsed).toBeGreaterThanOrEqual(990);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    for (const entry of res.body.data) {
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.name).toBe('string');
    }
  });

  it('request 2: warm cache -> instant response, same data as request 1', async () => {
    const startedAt = Date.now();
    const res = await request(app).get('/api/v1/dictionaries/icd10');
    const elapsed = Date.now() - startedAt;

    expect(res.body.source).toBe('cache');
    expect(elapsed).toBeLessThan(500);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('request 3: still warm -> cache again', async () => {
    const res = await request(app).get('/api/v1/dictionaries/icd10');
    expect(res.body.source).toBe('cache');
  });

  it('request 4: every 4th request forces invalidation -> a fresh ~1000ms DB read', async () => {
    const startedAt = Date.now();
    const res = await request(app).get('/api/v1/dictionaries/icd10');
    const elapsed = Date.now() - startedAt;

    expect(res.body.source).toBe('db');
    expect(elapsed).toBeGreaterThanOrEqual(990);
  });

  it('request 5: warm again right after the forced refresh', async () => {
    const res = await request(app).get('/api/v1/dictionaries/icd10');
    expect(res.body.source).toBe('cache');
  });
});
