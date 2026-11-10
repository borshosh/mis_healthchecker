import type { NextFunction, Request, Response } from 'express';

export interface Icd10Entry {
  id: string;
  code: string;
  name: string;
}

export interface Icd10Response {
  source: 'cache' | 'db';
  data: Icd10Entry[];
}

const CACHE_REFRESH_INTERVAL = 4;
const HEAVY_READ_DELAY_MS = 1000;

const ICD10_ENTRIES: Icd10Entry[] = [
  { id: '1', code: 'J06.9', name: 'Острая инфекция верхних дыхательных путей неуточнённая' },
  { id: '2', code: 'I10', name: 'Эссенциальная (первичная) гипертензия' },
  { id: '3', code: 'E11', name: 'Инсулиннезависимый сахарный диабет' },
  { id: '4', code: 'K29.7', name: 'Гастрит неуточнённый' },
];

let requestCount = 0;
let cachedEntries: Icd10Entry[] | null = null;
let pendingFetch: Promise<Icd10Entry[]> | null = null;

function simulateHeavyDatabaseRead(): Promise<Icd10Entry[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ICD10_ENTRIES), HEAVY_READ_DELAY_MS);
  });
}

// De-duplicates concurrent cold-cache requests: if a heavy read is already
// in flight, later callers await that same promise instead of each
// triggering their own 1000ms "DB" read.
async function loadEntries(): Promise<Icd10Entry[]> {
  if (pendingFetch === null) {
    pendingFetch = simulateHeavyDatabaseRead().finally(() => {
      pendingFetch = null;
    });
  }
  const entries = await pendingFetch;
  cachedEntries = entries;
  return entries;
}

// Atomic by construction: Node runs JS on a single thread, so this
// increment (and the invalidation decision derived from it) always runs to
// completion before any other request's synchronous code can interleave.
// No two concurrent requests can ever observe the same pre-increment count.
export function icd10RequestCounterMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  requestCount += 1;
  if (requestCount % CACHE_REFRESH_INTERVAL === 0) {
    cachedEntries = null;
  }
  next();
}

export async function handleGetIcd10(_req: Request, res: Response): Promise<void> {
  if (cachedEntries !== null) {
    const response: Icd10Response = { source: 'cache', data: cachedEntries };
    res.json(response);
    return;
  }

  const data = await loadEntries();
  const response: Icd10Response = { source: 'db', data };
  res.json(response);
}
