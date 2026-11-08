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

## Структура проекта

```
mis_healthchecker/
├── backend/   # Express + TypeScript API
└── frontend/  # Vue 3 + TypeScript + Ant Design Vue SPA
```
