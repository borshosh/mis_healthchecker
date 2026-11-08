import express from 'express';
import cors from 'cors';
import { getHealthSnapshot, ServiceOutageError } from './health';
import type { HealthResponse } from './types';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());

app.get('/', (_req, res) => {
  res.send('MIS Healthchecker backend is running');
});

app.get('/api/v1/health', (_req, res) => {
  try {
    const snapshot: HealthResponse = getHealthSnapshot();
    res.json(snapshot);
  } catch (error) {
    if (error instanceof ServiceOutageError) {
      res.status(500).json({ message: 'Internal Server Error' });
      return;
    }
    throw error;
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
