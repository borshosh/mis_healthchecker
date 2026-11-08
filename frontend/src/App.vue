<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchHealth } from './api/health';
import type { HealthResponse, ServiceStatus } from './types';

interface ServiceRow {
  key: string;
  name: string;
  status: ServiceStatus;
  latency_ms: number;
}

const SERVICE_LABELS: Record<keyof HealthResponse['services'], string> = {
  api: 'API',
  database: 'Database',
  auth: 'Auth',
};

const BADGE_COLOR: Record<ServiceStatus, string> = {
  UP: 'green',
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

function buildRows(response: HealthResponse): ServiceRow[] {
  return (Object.keys(response.services) as Array<keyof HealthResponse['services']>).map((key) => ({
    key,
    name: SERVICE_LABELS[key],
    status: response.services[key].status,
    latency_ms: response.services[key].latency_ms,
  }));
}

async function loadHealth(): Promise<void> {
  loading.value = true;
  try {
    const response = await fetchHealth();
    health.value = response;
    rows.value = buildRows(response);
  } finally {
    loading.value = false;
  }
}

onMounted(loadHealth);
</script>

<template>
  <h1>MIS Health Monitor</h1>
  <p v-if="health">
    Overall status: <a-badge :color="BADGE_COLOR[health.status === 'OPERATIONAL' ? 'UP' : health.status]" :text="health.status" />
  </p>
  <a-table :columns="columns" :data-source="rows" :loading="loading" :pagination="false" row-key="key">
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'status'">
        <a-badge :color="BADGE_COLOR[record.status as ServiceStatus]" :text="record.status" />
      </template>
    </template>
  </a-table>
</template>
