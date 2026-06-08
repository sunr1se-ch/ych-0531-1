import express, { type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const batches = await prisma.collectionBatch.findMany({
    include: {
      dehumidifier: true,
      inspectionRecords: {
        orderBy: { inspectionDate: 'desc' },
        take: 1,
      },
      outboundLogs: {
        orderBy: { outboundAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { batchNo: 'asc' },
  });
  
  const result = batches.map((batch) => {
    const latestInspection = batch.inspectionRecords[0];
    const latestOutbound = batch.outboundLogs[0];
    return {
      ...batch,
      latestInspection: latestInspection ? {
        ...latestInspection,
        paperWarpMm: latestInspection.paperWarpMm.toNumber(),
      } : null,
      latestOutbound,
      dehumidifier: {
        id: batch.dehumidifier.id,
        name: batch.dehumidifier.name,
        code: batch.dehumidifier.code,
        status: batch.dehumidifier.status,
      },
    };
  });
  
  res.json({ success: true, data: result });
}));

router.get('/check-outbound-allowed/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const batch = await prisma.collectionBatch.findUniqueOrThrow({
    where: { id },
    include: { dehumidifier: true },
  });
  
  const isAllowed = batch.dehumidifier.status !== 'pending_defrost';
  const isOutOfStock = batch.status === 'out_of_stock';
  
  res.json({
    success: true,
    data: {
      isAllowed: isAllowed && !isOutOfStock,
      isOutOfStock,
      dehumidifierStatus: batch.dehumidifier.status,
      dehumidifierName: batch.dehumidifier.name,
      warning: !isAllowed
        ? `该藏品所属除湿机「${batch.dehumidifier.name}」处于待除霜状态，强行出库可能导致藏品损坏`
        : null,
    },
  });
}));

router.post('/:id/outbound', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { operatorName, reason } = req.body;
  
  if (!operatorName) {
    return res.status(400).json({
      success: false,
      error: '操作人姓名不能为空',
    });
  }
  
  const batch = await prisma.collectionBatch.findUniqueOrThrow({
    where: { id },
    include: { dehumidifier: true },
  });
  
  if (batch.status === 'out_of_stock') {
    return res.status(400).json({
      success: false,
      error: '该藏品批次已出库',
    });
  }
  
  const isForceOutbound = batch.dehumidifier.status === 'pending_defrost';
  
  await prisma.$transaction(async (tx) => {
    await tx.outboundLog.create({
      data: {
        collectionBatchId: id,
        operatorName,
        isForceOutbound,
        forceReason: isForceOutbound ? reason : null,
      },
    });
    
    await tx.collectionBatch.update({
      where: { id },
      data: {
        status: 'out_of_stock',
        isRiskOutbound: isForceOutbound,
        riskReason: isForceOutbound ? reason : null,
      },
    });
  });
  
  const updatedBatch = await prisma.collectionBatch.findUniqueOrThrow({
    where: { id },
    include: {
      dehumidifier: true,
      inspectionRecords: {
        orderBy: { inspectionDate: 'desc' },
        take: 1,
      },
      outboundLogs: {
        orderBy: { outboundAt: 'desc' },
        take: 1,
      },
    },
  });
  
  res.json({
    success: true,
    data: {
      batch: updatedBatch,
      isForceOutbound,
      warning: isForceOutbound
        ? '警告：该藏品所属除湿机处于待除霜状态，此次出库存有藏品损坏风险'
        : null,
    },
  });
}));

router.post('/:id/inspect', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { paperWarpMm, inspectionDate, inspectorName } = req.body;
  
  if (paperWarpMm === undefined || !inspectionDate || !inspectorName) {
    return res.status(400).json({
      success: false,
      error: '纸张翘曲毫米数、抽检日期、质检员姓名不能为空',
    });
  }
  
  if (paperWarpMm < 0) {
    return res.status(400).json({
      success: false,
      error: '纸张翘曲毫米数不能为负数',
    });
  }
  
  const record = await prisma.inspectionRecord.create({
    data: {
      collectionBatchId: id,
      paperWarpMm: parseFloat(paperWarpMm),
      inspectionDate: new Date(inspectionDate),
      inspectorName,
    },
  });
  
  res.json({
    success: true,
    data: {
      ...record,
      paperWarpMm: record.paperWarpMm.toNumber(),
    },
  });
}));

export default router;
