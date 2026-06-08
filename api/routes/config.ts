import express, { type Request, type Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getSystemConfig } from '../services/defrostService.js';

const router = express.Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const config = getSystemConfig();
  res.json({ success: true, data: config });
}));

export default router;
