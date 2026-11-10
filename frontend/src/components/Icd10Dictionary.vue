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

// Tracks whichever request is currently "the one that matters". A new click
// aborts it before starting its own, so at most one request is ever in
// flight, and only its result is allowed to reach the UI.
let activeController: AbortController | null = null;

async function loadDictionary(): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;

  loading.value = true;
  const startedAt = performance.now();

  try {
    const response = await axios.get<Icd10Response>('/api/v1/dictionaries/icd10', {
      signal: controller.signal,
    });

    // A later click may have swapped in its own controller while this
    // request was still resolving (e.g. it won the race by a hair before
    // the abort signal was observed). If so, this response is stale even
    // though it technically completed - discard it.
    if (activeController !== controller) {
      return;
    }

    elapsedMs.value = Math.round(performance.now() - startedAt);
    entries.value = response.data.data;
    alertInfo.value =
      response.data.source === 'cache'
        ? { type: 'success', message: 'SUCCESS: Данные получены из кэша сервера' }
        : { type: 'info', message: 'ATTENTION: Тяжелый запрос к БД' };
  } catch (err) {
    if (axios.isCancel(err)) {
      return;
    }
    console.error('Failed to load ICD-10 dictionary', err);
  } finally {
    if (activeController === controller) {
      loading.value = false;
      activeController = null;
    }
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
