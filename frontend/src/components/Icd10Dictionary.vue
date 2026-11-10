<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import type { Icd10Entry, Icd10Response } from '../../../backend/src/icd10';

interface AlertInfo {
  type: 'success' | 'info';
  message: string;
}

const entries = ref<Icd10Entry[]>([]);
const loading = ref(false);
const elapsedMs = ref<number | null>(null);
const alertInfo = ref<AlertInfo | null>(null);

const columns = [
  { title: 'Код МКБ-10', dataIndex: 'code', key: 'code' },
  { title: 'Диагноз', dataIndex: 'name', key: 'name' },
];

async function loadDictionary(): Promise<void> {
  loading.value = true;
  const startedAt = performance.now();

  try {
    const response = await axios.get<Icd10Response>('/api/v1/dictionaries/icd10');

    elapsedMs.value = Math.round(performance.now() - startedAt);
    entries.value = response.data.data;
    alertInfo.value =
      response.data.source === 'cache'
        ? { type: 'success', message: 'SUCCESS: Данные получены из кэша сервера' }
        : { type: 'info', message: 'ATTENTION: Тяжелый запрос к БД' };
  } finally {
    loading.value = false;
  }
}

onMounted(loadDictionary);
</script>

<template>
  <h2>Справочник МКБ-10</h2>
  <a-alert
    v-if="alertInfo"
    :type="alertInfo.type"
    :message="alertInfo.message"
    show-icon
    closable
    @close="alertInfo = null"
  />
  <p v-if="elapsedMs !== null">Время запроса: {{ elapsedMs }} мс</p>
  <a-button type="primary" :loading="loading" @click="loadDictionary">Обновить данные</a-button>
  <a-table :columns="columns" :data-source="entries" :pagination="false" row-key="id" />
</template>
