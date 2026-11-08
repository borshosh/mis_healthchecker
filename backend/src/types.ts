export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';

export type OverallStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN';

export interface ServiceHealth {
  status: ServiceStatus;
  latency_ms: number;
}

export interface HealthServices {
  api: ServiceHealth;
  database: ServiceHealth;
  auth: ServiceHealth;
}

export interface HealthResponse {
  status: OverallStatus;
  services: HealthServices;
  timestamp: string;
}
