import express from 'express';
import cors from 'cors';
import { getHealthSnapshot, ServiceOutageError } from './health';
import { handleCheckup } from './checkup';
import { isPayloadTooLargeError } from './httpErrors';
import type { HealthResponse } from './types';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

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

  app.post('/api/v1/patients/checkup', handleCheckup);

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isPayloadTooLargeError(err)) {
      res.status(413).json({ error: 'Payload Too Large' });
      return;
    }
    next(err);
  });

  return app;
}
