import express, { type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { buildDehumidifierSummary } from '../services/defrostService.js';

const router = express.Router();

function buildCollectionBatches(batches: Array<{
  id: number;
  batchNo: string;
  name: string;
  status: string;
  inspectionRecords: Array<{
    id: number;
    paperWarpMm: { toNumber: () => number };
    inspectionDate: Date;
    inspectorName: string;
  }>;
}>) {
  return batches.map((batch) => {
    const latestInspection = batch.inspectionRecords[0];
    return {
      id: batch.id,
      batchNo: batch.batchNo,
      name: batch.name,
      status: batch.status,
      latestInspection: latestInspection ? {
        id: latestInspection.id,
        paperWarpMm: latestInspection.paperWarpMm.toNumber(),
        inspectionDate: latestInspection.inspectionDate,
        inspectorName: latestInspection.inspectorName,
      } : null,
    };
  });
}

router.get('/workbench', asyncHandler(async (_req: Request, res: Response) => {
  const dehumidifiers = await prisma.dehumidifier.findMany({
    include: {
      humidityRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
      collectionBatches: {
        where: { status: 'in_stock' },
        include: {
          inspectionRecords: {
            orderBy: { inspectionDate: 'desc' },
            take: 1,
          },
        },
      },
      _count: {
        select: { collectionBatches: { where: { status: 'in_stock' } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const result = dehumidifiers.map((d) => {
    const summary = buildDehumidifierSummary(d);
    const collectionBatches = buildCollectionBatches(d.collectionBatches);

    return {
      ...summary,
      collectionBatches,
    };
  });

  result.sort((a, b) => {
    if (a.isPendingDefrost && !b.isPendingDefrost) return -1;
    if (!a.isPendingDefrost && b.isPendingDefrost) return 1;
    return b.hoursOverdue - a.hoursOverdue;
  });

  res.json({ success: true, data: result });
}));

router.get('/dehumidifier/:id/detail', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const hours = 72;

  const [dehumidifier, humidityRecords] = await Promise.all([
    prisma.dehumidifier.findUniqueOrThrow({
      where: { id },
      include: {
        humidityRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        collectionBatches: {
          where: { status: 'in_stock' },
          include: {
            inspectionRecords: {
              orderBy: { inspectionDate: 'desc' },
              take: 1,
            },
          },
        },
        _count: {
          select: { collectionBatches: { where: { status: 'in_stock' } } },
        },
      },
    }),
    prisma.humidityRecord.findMany({
      where: { dehumidifierId: id },
      orderBy: { recordedAt: 'desc' },
      take: hours,
    }),
  ]);

  const summary = buildDehumidifierSummary(dehumidifier);

  const humidityData = humidityRecords.map(r => ({
    ...r,
    humidity: r.humidity.toNumber(),
  })).reverse();

  const collectionBatches = buildCollectionBatches(dehumidifier.collectionBatches);

  res.json({
    success: true,
    data: {
      ...summary,
      humidityData,
      collectionBatches,
    },
  });
}));

export default router;
