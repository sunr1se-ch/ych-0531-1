import express, { type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { checkPendingDefrost } from '../services/defrostService.js';

const router = express.Router();

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
    const checkResult = checkPendingDefrost(d, d.humidityRecords);
    const latestHumidity = d.humidityRecords[0];
    const hoursOverdue = Math.max(0, checkResult.hoursSinceLastDefrost - d.defrostIntervalHours);
    
    const collectionBatches = d.collectionBatches.map((batch) => {
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

    return {
      id: d.id,
      name: d.name,
      code: d.code,
      status: d.status,
      coolingZone: d.coolingZone,
      defrostIntervalHours: d.defrostIntervalHours,
      lastDefrostAt: d.lastDefrostAt,
      latestHumidity: latestHumidity?.humidity.toNumber() ?? null,
      hoursSinceLastDefrost: checkResult.hoursSinceLastDefrost,
      consecutiveHighHumidity: checkResult.consecutiveHighHumidity,
      hoursOverdue,
      isPendingDefrost: d.status === 'pending_defrost',
      affectedBatches: d._count.collectionBatches,
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

  const checkResult = checkPendingDefrost(dehumidifier, dehumidifier.humidityRecords);
  const latestHumidity = dehumidifier.humidityRecords[0];
  const hoursOverdue = Math.max(0, checkResult.hoursSinceLastDefrost - dehumidifier.defrostIntervalHours);

  const humidityData = humidityRecords.map(r => ({
    ...r,
    humidity: r.humidity.toNumber(),
  })).reverse();

  const collectionBatches = dehumidifier.collectionBatches.map((batch) => {
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

  res.json({
    success: true,
    data: {
      id: dehumidifier.id,
      name: dehumidifier.name,
      code: dehumidifier.code,
      status: dehumidifier.status,
      coolingZone: dehumidifier.coolingZone,
      defrostIntervalHours: dehumidifier.defrostIntervalHours,
      lastDefrostAt: dehumidifier.lastDefrostAt,
      latestHumidity: latestHumidity?.humidity.toNumber() ?? null,
      hoursSinceLastDefrost: checkResult.hoursSinceLastDefrost,
      consecutiveHighHumidity: checkResult.consecutiveHighHumidity,
      hoursOverdue,
      isPendingDefrost: dehumidifier.status === 'pending_defrost',
      affectedBatches: dehumidifier._count.collectionBatches,
      humidityData,
      collectionBatches,
    },
  });
}));

export default router;
