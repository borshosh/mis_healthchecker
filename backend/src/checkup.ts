import type { Request, Response } from 'express';
import { checkupSchema, isolateContractBody, mapZodIssuesToErrors } from './schemas/checkup';

const TRANSACTION_FAILURE_KEYWORD = 'throw_error';

export function handleCheckup(req: Request, res: Response): void {
  const rawBody: unknown = req.body;
  const isolated = isolateContractBody(rawBody);

  if (isolated === null) {
    res.status(400).json({
      error: 'Request body must contain only patientId, temperature, pulse, complaints and hasInsurance',
    });
    return;
  }

  const parsed = checkupSchema.safeParse(isolated);

  if (!parsed.success) {
    res.status(400).json({ errors: mapZodIssuesToErrors(parsed.error.issues) });
    return;
  }

  if (parsed.data.complaints.includes(TRANSACTION_FAILURE_KEYWORD)) {
    res.status(500).json({ error: 'Сбой транзакции МИС' });
    return;
  }

  res.status(201).json({ status: 'ok' });
}
