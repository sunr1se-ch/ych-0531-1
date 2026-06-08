import express, { type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { buildDehumidifierSummary, confirmDefrost, updateDehumidifierStatusIfNeeded } from '../services/defrostService.js';

const router = express.Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  
  const dehumidifiers = await prisma.dehumidifier.findMany({
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
  
  let result = dehumidifiers.map((d) => buildDehumidifierSummary(d));
  
  if (status && status !== 'all') {
    result = result.filter((d) => d.status === status);
  }
  
  result.sort((a, b) => {
    if (a.isPendingDefrost && !b.isPendingDefrost) return -1;
    if (!a.isPendingDefrost && b.isPendingDefrost) return 1;
    return b.hoursOverdue - a.hoursOverdue;
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
        take: 10,
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
  
  const summary = buildDehumidifierSummary(dehumidifier);
  const humidityRecords = await prisma.humidityRecord.findMany({
    where: { dehumidifierId: id },
    orderBy: { recordedAt: 'desc' },
    take: 72,
  });
  
  res.json({
    success: true,
    data: {
      ...summary,
      defrostHistories: dehumidifier.defrostHistories,
      humidityData: humidityRecords.map(r => ({
        ...r,
        humidity: r.humidity.toNumber(),
      })).reverse(),
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
  
  res.json({ success: true, data: { ...result.dehumidifier, ...result.summary } });
}));

router.post('/:id/update-status', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const result = await updateDehumidifierStatusIfNeeded(id);
  res.json({ success: true, data: { ...result, ...result.summary } });
}));

export default router;
