import express, { type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { checkPendingDefrost, confirmDefrost, updateDehumidifierStatusIfNeeded } from '../services/defrostService.js';

const router = express.Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  
  const where = status && status !== 'all' 
    ? { status: status as string }
    : undefined;
  
  const dehumidifiers = await prisma.dehumidifier.findMany({
    where,
    include: {
      humidityRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { collectionBatches: { where: { status: 'in_stock' } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  const result = dehumidifiers.map((d) => {
    const checkResult = checkPendingDefrost(d, d.humidityRecords);
    const latestHumidity = d.humidityRecords[0];
    return {
      ...d,
      latestHumidity: latestHumidity?.humidity.toNumber() ?? null,
      hoursSinceLastDefrost: checkResult.hoursSinceLastDefrost,
      consecutiveHighHumidity: checkResult.consecutiveHighHumidity,
      affectedBatches: d._count.collectionBatches,
    };
  });
  
  res.json({ success: true, data: result });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const dehumidifier = await prisma.dehumidifier.findUniqueOrThrow({
    where: { id },
    include: {
      humidityRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 72,
      },
      defrostHistories: {
        orderBy: { completedAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { collectionBatches: { where: { status: 'in_stock' } } },
      },
    },
  });
  
  const checkResult = checkPendingDefrost(dehumidifier, dehumidifier.humidityRecords);
  const latestHumidity = dehumidifier.humidityRecords[0];
  
  res.json({
    success: true,
    data: {
      ...dehumidifier,
      latestHumidity: latestHumidity?.humidity.toNumber() ?? null,
      hoursSinceLastDefrost: checkResult.hoursSinceLastDefrost,
      consecutiveHighHumidity: checkResult.consecutiveHighHumidity,
      affectedBatches: dehumidifier._count.collectionBatches,
    },
  });
}));

router.get('/:id/humidity', asyncHandler(async (req: Request, res: Response) => {
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

router.post('/:id/confirm-defrost', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { operatorName, remark } = req.body;
  
  if (!operatorName) {
    return res.status(400).json({
      success: false,
      error: '操作人姓名不能为空',
    });
  }
  
  const result = await confirmDefrost(id, operatorName, remark);
  
  res.json({ success: true, data: result });
}));

router.post('/:id/update-status', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const result = await updateDehumidifierStatusIfNeeded(id);
  res.json({ success: true, data: result });
}));

export default router;
