# MIS Health Monitor

Локальный монитор статуса компонентов МИС: Express + TypeScript бэкенд с имитацией сбоев и Vue 3 + TypeScript + Ant Design Vue фронтенд.

## Стек

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Vue 3, TypeScript, Vite, Ant Design Vue, Axios

## Запуск

### Backend

```bash
cd backend
npm install
npm run dev
```

Поднимется на `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Поднимется на `http://localhost:5173` (или на следующем свободном порту). В dev-режиме Vite проксирует запросы `/api/*` на `http://localhost:3001` (см. `frontend/vite.config.ts`), поэтому бэкенд должен быть запущен первым.

### Сборка

```bash
cd backend && npm run build
cd frontend && npm run build
```

### Тесты

```bash
cd backend
npm test
```

Юнит- и интеграционные тесты (Vitest + Supertest, `backend/src/**/*.test.ts`) покрывают: Zod-схему анкеты (валидный пейлоад, ложные числовые триггеры `false`/`null`/`[]`, невалидный UUID), изоляцию контракта (`__proto__`/посторонние ключи), сборку карты ошибок, имитацию сбоя `/api/v1/health`, а сам эндпоинт `/api/v1/patients/checkup` — через поднятое в памяти Express-приложение (без реального порта): `201`, `400` (включая 413 на превышении лимита) и `500` при `throw_error`.

Для ручной проверки живого сервера есть `scripts/checkup-curl-tests.sh` — прогоняет те же сценарии через `curl` по сети, каждый сценарий можно запустить отдельно:

```bash
cd backend && npm run dev   # в одном терминале

./scripts/checkup-curl-tests.sh                   # все сценарии подряд
./scripts/checkup-curl-tests.sh valid              # только один сценарий
./scripts/checkup-curl-tests.sh help               # список доступных сценариев
```

## API

`GET /api/v1/health`

```json
{
  "status": "OPERATIONAL" | "DEGRADED" | "DOWN",
  "services": {
    "api": { "status": "UP" | "DEGRADED" | "DOWN", "latency_ms": number },
    "database": { "status": "UP" | "DEGRADED" | "DOWN", "latency_ms": number },
    "auth": { "status": "UP" | "DEGRADED" | "DOWN", "latency_ms": number }
  },
  "timestamp": "ISO String"
}
```

### Имитация сбоев

Бэкенд хранит счётчик запросов в памяти процесса (не сбрасывается между запросами). Каждый 3-й запрос гарантированно завершается сбоем:

- один из сервисов (`api`, `database` или `auth`) случайно получает статус `DOWN` или `DEGRADED`, либо
- весь запрос завершается `HTTP 500`.

## Анкета первичного осмотра

`POST /api/v1/patients/checkup`

Контракт (тип `CheckupPayload` выведен на бэкенде через `z.infer<typeof checkupSchema>` в [backend/src/schemas/checkup.ts](backend/src/schemas/checkup.ts) и переиспользуется на фронтенде через `import type`, без ручного дублирования):

```json
{
  "patientId": "string (UUID)",
  "temperature": "number",
  "pulse": "number",
  "complaints": "string",
  "hasInsurance": "boolean"
}
```

Защита на бэкенде:

- тело запроса ограничено `express.json({ limit: '100kb' })` — превышение лимита отдаёт `413 Payload Too Large`;
- перед валидацией сырой `req.body` изолируется в новый объект без прототипа, содержащий только пять ключей контракта; любой посторонний ключ (например, `__proto__`) отклоняется как `400 Bad Request`;
- числовые поля проходят строгий препроцессинг — `false`, `null`, `[]` и подобные ложные значения не приводятся к `0`, а отклоняются как ошибка валидации;
- карта ошибок `{"errors": {"fieldName": "message"}}` собирается безопасным проходом по `error.issues` с рантайм-проверкой типа ключа (`typeof key === 'string'`), без `as`;
- если в `complaints` встречается `throw_error`, запрос завершается `500` с телом `{"error": "Сбой транзакции МИС"}` (имитация сбоя транзакции).

На фронтенде форма (`a-input`, `a-input-number`, `a-textarea`, `a-switch`, `a-button`) при `400` подсвечивает конкретные поля через `validate-status="error"` и `help` у `a-form-item` (сам текст ошибки в `validate-status` не передаётся), а при `500` показывает глобальный `a-alert`.

Во всём коде бэкенда и фронтенда не используются `any` и `as` (type assertion).

## Справочник МКБ-10 (кэш + защита от race conditions)

`GET /api/v1/dictionaries/icd10`

```json
{
  "source": "cache" | "db",
  "data": [{ "id": "string", "code": "string", "name": "string" }]
}
```

### Кэш и инвалидация на бэкенде ([backend/src/icd10.ts](backend/src/icd10.ts))

- Холодный кэш имитирует тяжёлое чтение из БД через `setTimeout` строго на 1000 мс; тёплый кэш отвечает синхронно (0–2 мс).
- `icd10RequestCounterMiddleware` — отдельный Express middleware (регистрируется перед хендлером), который атомарно инкрементирует счётчик запросов и обнуляет кэш на каждом 4-м запросе. Атомарность — следствие однопоточности Node: инкремент и проверка `% 4 === 0` выполняются синхронно одним куском, без await внутри, поэтому ни один другой запрос не может вклиниться между чтением и записью счётчика.
- Параллельные запросы на холодный кэш не дублируют тяжёлое чтение: `loadEntries()` переиспользует один и тот же in-flight `Promise` — проверено инструментированием (3 параллельных запроса → 1 вызов симуляции чтения из БД).

### AbortController на фронтенде ([frontend/src/components/Icd10Dictionary.vue](frontend/src/components/Icd10Dictionary.vue))

- Каждый клик по «Обновить данные» сначала вызывает `.abort()` у контроллера предыдущего запроса, затем создаёт новый `AbortController` и сохраняет его в `activeController`.
- По возвращении ответа хендлер дополнительно сверяет `activeController === controller` перед записью в состояние — вторая защита на случай, если ответ пришёл на волосок раньше, чем сигнал отмены был замечен.
- `axios.isCancel(err)` гасит отменённые запросы без вывода ошибки. Живьём проверено: 5 быстрых кликов подряд по медленному (~1000 мс) запросу стабильно дают ровно один результат в интерфейсе, без ошибок в консоли.

## Структура проекта

```
mis_healthchecker/
├── backend/   # Express + TypeScript API
└── frontend/  # Vue 3 + TypeScript + Ant Design Vue SPA
```
