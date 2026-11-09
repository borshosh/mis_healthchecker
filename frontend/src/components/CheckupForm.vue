<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ServerError, ValidationError, submitCheckup } from '../api/checkup';
import type { CheckupPayload } from '../../../backend/src/schemas/checkup';

interface GlobalError {
  message: string;
  time: string;
}

const form = reactive<Partial<CheckupPayload>>({
  patientId: '',
  complaints: '',
  hasInsurance: false,
});

const fieldErrors = ref<Record<string, string>>({});
const globalError = ref<GlobalError | null>(null);
const submitting = ref(false);
const submitted = ref(false);

function fieldStatus(field: string): '' | 'error' {
  return fieldErrors.value[field] ? 'error' : '';
}

function fieldHelp(field: string): string | undefined {
  return fieldErrors.value[field];
}

async function handleSubmit(): Promise<void> {
  submitting.value = true;
  fieldErrors.value = {};
  globalError.value = null;
  submitted.value = false;
  try {
    await submitCheckup(form);
    submitted.value = true;
  } catch (err) {
    if (err instanceof ValidationError) {
      fieldErrors.value = err.errors;
    } else if (err instanceof ServerError) {
      globalError.value = { message: err.message, time: new Date().toLocaleString('ru-RU') };
    } else {
      globalError.value = { message: 'Unexpected error', time: new Date().toLocaleString('ru-RU') };
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <a-alert
    v-if="globalError"
    type="error"
    :message="globalError.message"
    :description="`Время сбоя: ${globalError.time}`"
    show-icon
    closable
    @close="globalError = null"
  />
  <h2>Анкета первичного осмотра</h2>
  <a-alert
    v-if="submitted"
    type="success"
    message="Анкета успешно сохранена"
    show-icon
    closable
    @close="submitted = false"
  />
  <a-form layout="vertical" :model="form" @finish="handleSubmit">
    <a-form-item
      label="ID пациента"
      name="patientId"
      :validate-status="fieldStatus('patientId')"
      :help="fieldHelp('patientId')"
    >
      <a-input v-model:value="form.patientId" placeholder="UUID пациента" />
    </a-form-item>
    <a-form-item
      label="Температура"
      name="temperature"
      :validate-status="fieldStatus('temperature')"
      :help="fieldHelp('temperature')"
    >
      <a-input-number v-model:value="form.temperature" :step="0.1" />
    </a-form-item>
    <a-form-item
      label="Пульс"
      name="pulse"
      :validate-status="fieldStatus('pulse')"
      :help="fieldHelp('pulse')"
    >
      <a-input-number v-model:value="form.pulse" />
    </a-form-item>
    <a-form-item
      label="Жалобы"
      name="complaints"
      :validate-status="fieldStatus('complaints')"
      :help="fieldHelp('complaints')"
    >
      <a-textarea v-model:value="form.complaints" :rows="3" />
    </a-form-item>
    <a-form-item label="Есть страховка" name="hasInsurance">
      <a-switch v-model:checked="form.hasInsurance" />
    </a-form-item>
    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="submitting">Отправить</a-button>
    </a-form-item>
  </a-form>
</template>
