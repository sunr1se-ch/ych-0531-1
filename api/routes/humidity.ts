import express, { type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { updateDehumidifierStatusIfNeeded } from '../services/defrostService.js';

const router = express.Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { dehumidifierId, humidity, recordedAt } = req.body;
  
  if (!dehumidifierId || humidity === undefined) {
    return res.status(400).json({
      success: false,
      error: '除湿机ID和湿度值不能为空',
    });
  }
  
  if (humidity < 0 || humidity > 100) {
    return res.status(400).json({
      success: false,
      error: '湿度值必须在0-100之间',
    });
  }
  
  const record = await prisma.humidityRecord.create({
    data: {
      dehumidifierId: parseInt(dehumidifierId),
      humidity: parseFloat(humidity),
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    },
  });
  
  await updateDehumidifierStatusIfNeeded(parseInt(dehumidifierId));
  
  res.json({
    success: true,
    data: { ...record, humidity: record.humidity.toNumber() },
  });
}));

router.get('/dehumidifier/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const hours = parseInt(req.query.hours as string) || 72;
  
  const records = await prisma.humidityRecord.findMany({
    where: { dehumidifierId: id },
    orderBy: { recordedAt: 'desc' },
    take: hours,
  });
  
  const result = records.map(r => ({
    ...r,
    humidity: r.humidity.toNumber(),
  })).reverse();
  
  res.json({ success: true, data: result });
}));

export default router;
