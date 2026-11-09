<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { fetchHealth } from './api/health';
import CheckupForm from './components/CheckupForm.vue';
import type { HealthResponse, OverallStatus, ServiceStatus } from './types';

interface ServiceRow {
  key: string;
  name: string;
  status: ServiceStatus;
  latency_ms: number;
}

interface HealthError {
  message: string;
  time: string;
}

const SERVICE_LABELS: Record<keyof HealthResponse['services'], string> = {
  api: 'API',
  database: 'Database',
  auth: 'Auth',
};

const SERVICE_BADGE_COLOR: Record<ServiceStatus, string> = {
  UP: 'green',
  DEGRADED: 'gold',
  DOWN: 'red',
};

const OVERALL_BADGE_COLOR: Record<OverallStatus, string> = {
  OPERATIONAL: 'green',
  DEGRADED: 'gold',
  DOWN: 'red',
};

const columns = [
  { title: 'Service', dataIndex: 'name', key: 'name' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
  { title: 'Latency (ms)', dataIndex: 'latency_ms', key: 'latency_ms' },
];

const health = ref<HealthResponse | null>(null);
const rows = ref<ServiceRow[]>([]);
const loading = ref(false);
const error = ref<HealthError | null>(null);

const SERVICE_KEYS: Array<keyof HealthResponse['services']> = ['api', 'database', 'auth'];

function buildRows(response: HealthResponse): ServiceRow[] {
  return SERVICE_KEYS.map((key) => ({
    key,
    name: SERVICE_LABELS[key],
    status: response.services[key].status,
    latency_ms: response.services[key].latency_ms,
  }));
}

function badgeColorFor(status: unknown): string {
  if (status === 'UP' || status === 'DEGRADED' || status === 'DOWN') {
    return SERVICE_BADGE_COLOR[status];
  }
  return 'default';
}

function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      return `Backend returned HTTP ${err.response.status}`;
    }
    return 'Backend is unavailable';
  }
  return 'Unexpected error';
}

async function loadHealth(): Promise<void> {
  loading.value = true;
  try {
    const response = await fetchHealth();
    health.value = response;
    rows.value = buildRows(response);
    error.value = null;
  } catch (err) {
    error.value = { message: describeError(err), time: new Date().toLocaleString('ru-RU') };
  } finally {
    loading.value = false;
  }
}

onMounted(loadHealth);
</script>

<template>
  <a-alert
    v-if="error"
    type="error"
    :message="error.message"
    :description="`Время сбоя: ${error.time}`"
    show-icon
    closable
    @close="error = null"
  />
  <h1>MIS Health Monitor</h1>
  <p v-if="health">
    Overall status: <a-badge :color="OVERALL_BADGE_COLOR[health.status]" :text="health.status" />
  </p>
  <a-button type="primary" :loading="loading" @click="loadHealth">Перепроверить</a-button>
  <a-table
    :columns="columns"
    :data-source="rows"
    :loading="loading"
    :pagination="false"
    row-key="key"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'status'">
        <a-badge :color="badgeColorFor(record.status)" :text="record.status" />
      </template>
    </template>
  </a-table>
  <a-divider />
  <CheckupForm />
</template>
