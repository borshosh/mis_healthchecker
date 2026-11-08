import axios from 'axios';
import type { HealthResponse } from '../types';

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await axios.get<HealthResponse>('/api/v1/health');
  return response.data;
}
