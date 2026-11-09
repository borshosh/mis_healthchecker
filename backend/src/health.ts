import type { HealthResponse, HealthServices, ServiceHealth, ServiceStatus } from './types';

type ServiceName = 'api' | 'database' | 'auth';
const SERVICE_NAMES: ServiceName[] = ['api', 'database', 'auth'];

const FAILURE_INTERVAL = 3;

let requestCount = 0;

export class ServiceOutageError extends Error {}

function randomLatency(): number {
  return Math.floor(Math.random() * 180) + 10;
}

function buildHealthyServices(): HealthServices {
  return {
    api: { status: 'UP', latency_ms: randomLatency() },
    database: { status: 'UP', latency_ms: randomLatency() },
    auth: { status: 'UP', latency_ms: randomLatency() },
  };
}

function applyRandomFailure(services: HealthServices): void {
  const failingService: ServiceName =
    SERVICE_NAMES[Math.floor(Math.random() * SERVICE_NAMES.length)];
  const failingStatus: ServiceStatus = Math.random() < 0.5 ? 'DOWN' : 'DEGRADED';
  const degraded: ServiceHealth = { status: failingStatus, latency_ms: randomLatency() };
  services[failingService] = degraded;
}

function aggregateStatus(services: HealthServices): HealthResponse['status'] {
  const statuses = Object.values(services).map((service) => service.status);
  if (statuses.includes('DOWN')) return 'DOWN';
  if (statuses.includes('DEGRADED')) return 'DEGRADED';
  return 'OPERATIONAL';
}

export function getHealthSnapshot(): HealthResponse {
  requestCount += 1;
  const isFailureTurn = requestCount % FAILURE_INTERVAL === 0;

  if (isFailureTurn && Math.random() < 0.5) {
    throw new ServiceOutageError('Simulated full network outage');
  }

  const services = buildHealthyServices();

  if (isFailureTurn) {
    applyRandomFailure(services);
  }

  return {
    status: aggregateStatus(services),
    services,
    timestamp: new Date().toISOString(),
  };
}
