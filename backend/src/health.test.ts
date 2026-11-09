import { describe, expect, it } from 'vitest';
import { getHealthSnapshot, ServiceOutageError } from './health';

const SERVICE_STATUSES = ['UP', 'DEGRADED', 'DOWN'];

describe('getHealthSnapshot', () => {
  it('returns a well-formed healthy snapshot on the first call', () => {
    const snapshot = getHealthSnapshot();
    expect(snapshot.status).toBe('OPERATIONAL');
    expect(Object.keys(snapshot.services)).toEqual(['api', 'database', 'auth']);
    for (const service of Object.values(snapshot.services)) {
      expect(SERVICE_STATUSES).toContain(service.status);
      expect(service.latency_ms).toBeGreaterThanOrEqual(10);
      expect(service.latency_ms).toBeLessThan(190);
    }
    expect(typeof snapshot.timestamp).toBe('string');
    expect(() => new Date(snapshot.timestamp).toISOString()).not.toThrow();
  });

  it('stays healthy on the second call', () => {
    const snapshot = getHealthSnapshot();
    expect(snapshot.status).toBe('OPERATIONAL');
  });

  it('forces a failure on the 3rd call: either a thrown outage or a degraded service', () => {
    try {
      const snapshot = getHealthSnapshot();
      const statuses = Object.values(snapshot.services).map((service) => service.status);
      expect(snapshot.status).not.toBe('OPERATIONAL');
      expect(statuses.some((status) => status !== 'UP')).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceOutageError);
    }
  });
});
