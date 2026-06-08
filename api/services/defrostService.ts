import prisma from '../lib/prisma.js';
import type { Dehumidifier, HumidityRecord, CollectionBatch } from '@prisma/client';

export const HUMIDITY_THRESHOLD = 58;
export const CONSECUTIVE_HIGH_COUNT = 3;
export const OVERDUE_HOURS = 6;

export interface DehumidifierSummary {
  id: number;
  name: string;
  code: string;
  status: 'normal' | 'pending_defrost';
  coolingZone: string;
  defrostIntervalHours: number;
  lastDefrostAt: Date;
  createdAt: Date;
  latestHumidity: number | null;
  hoursSinceLastDefrost: number;
  consecutiveHighHumidity: number;
  hoursOverdue: number;
  isPendingDefrost: boolean;
  isOverdue: boolean;
  allHighHumidity: boolean;
  affectedBatches: number;
}

export interface SystemConfig {
  humidityThreshold: number;
  consecutiveHighCount: number;
  overdueHours: number;
}

export function getSystemConfig(): SystemConfig {
  return {
    humidityThreshold: HUMIDITY_THRESHOLD,
    consecutiveHighCount: CONSECUTIVE_HIGH_COUNT,
    overdueHours: OVERDUE_HOURS,
  };
}

export function checkPendingDefrost(
  dehumidifier: Dehumidifier,
  recentHumidity: HumidityRecord[]
): {
  isPending: boolean;
  hoursSinceLastDefrost: number;
  consecutiveHighHumidity: number;
  isOverdue: boolean;
  allHighHumidity: boolean;
} {
  const hoursSinceLastDefrost = 
    (Date.now() - new Date(dehumidifier.lastDefrostAt).getTime()) / 3600000;
  
  const isOverdue = hoursSinceLastDefrost > 
    dehumidifier.defrostIntervalHours + OVERDUE_HOURS;
  
  const sortedHumidity = [...recentHumidity].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
  
  let consecutiveHighHumidity = 0;
  for (const record of sortedHumidity) {
    if (record.humidity.toNumber() > HUMIDITY_THRESHOLD) {
      consecutiveHighHumidity++;
    } else {
      break;
    }
  }
  
  const allHighHumidity = consecutiveHighHumidity >= CONSECUTIVE_HIGH_COUNT;
  const isPending = isOverdue && allHighHumidity;
  
  return {
    isPending,
    hoursSinceLastDefrost,
    consecutiveHighHumidity,
    isOverdue,
    allHighHumidity,
  };
}

export function buildDehumidifierSummary(
  dehumidifier: Dehumidifier & {
    humidityRecords?: HumidityRecord[];
    collectionBatches?: CollectionBatch[];
    _count?: { collectionBatches?: number };
  }
): DehumidifierSummary {
  const humidityRecords = dehumidifier.humidityRecords || [];
  const checkResult = checkPendingDefrost(dehumidifier, humidityRecords);
  const latestHumidity = humidityRecords[0];
  const affectedBatches = dehumidifier._count?.collectionBatches ?? 
    (dehumidifier.collectionBatches?.filter(b => b.status === 'in_stock').length || 0);
  
  return {
    id: dehumidifier.id,
    name: dehumidifier.name,
    code: dehumidifier.code,
    status: checkResult.isPending ? 'pending_defrost' : 'normal',
    coolingZone: dehumidifier.coolingZone,
    defrostIntervalHours: dehumidifier.defrostIntervalHours,
    lastDefrostAt: dehumidifier.lastDefrostAt,
    createdAt: dehumidifier.createdAt,
    latestHumidity: latestHumidity?.humidity.toNumber() ?? null,
    hoursSinceLastDefrost: checkResult.hoursSinceLastDefrost,
    consecutiveHighHumidity: checkResult.consecutiveHighHumidity,
    hoursOverdue: Math.max(0, checkResult.hoursSinceLastDefrost - dehumidifier.defrostIntervalHours),
    isPendingDefrost: checkResult.isPending,
    isOverdue: checkResult.isOverdue,
    allHighHumidity: checkResult.allHighHumidity,
    affectedBatches,
  };
}

export async function updateDehumidifierStatusIfNeeded(
  dehumidifierId: number
): Promise<Dehumidifier & { summary: DehumidifierSummary }> {
  const dehumidifier = await prisma.dehumidifier.findUniqueOrThrow({
    where: { id: dehumidifierId },
    include: {
      humidityRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { collectionBatches: { where: { status: 'in_stock' } } },
      },
    },
  });
  
  const summary = buildDehumidifierSummary(dehumidifier);
  const newStatus = summary.isPendingDefrost ? 'pending_defrost' : 'normal';
  
  let updated = dehumidifier;
  if (dehumidifier.status !== newStatus) {
    updated = await prisma.dehumidifier.update({
      where: { id: dehumidifierId },
      data: { status: newStatus },
      include: {
        humidityRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { collectionBatches: { where: { status: 'in_stock' } } },
        },
      },
    });
  }
  
  return { ...updated, summary: buildDehumidifierSummary(updated) };
}

export async function getDefrostTodoList(): Promise<Array<{
  dehumidifier: DehumidifierSummary;
  hoursOverdue: number;
  consecutiveHighHumidity: number;
  affectedBatches: number;
}>> {
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
  });
  
  return dehumidifiers
    .map((d) => {
      const summary = buildDehumidifierSummary(d);
      return {
        dehumidifier: summary,
        hoursOverdue: summary.hoursOverdue,
        consecutiveHighHumidity: summary.consecutiveHighHumidity,
        affectedBatches: summary.affectedBatches,
      };
    })
    .filter(item => item.dehumidifier.isPendingDefrost)
    .sort((a, b) => b.hoursOverdue - a.hoursOverdue);
}

export async function confirmDefrost(
  dehumidifierId: number,
  operatorName: string,
  remark?: string
): Promise<{ dehumidifier: Dehumidifier; summary: DehumidifierSummary }> {
  const result = await prisma.$transaction(async (tx) => {
    await tx.defrostHistory.create({
      data: {
        dehumidifierId,
        operatorName,
        remark,
      },
    });
    
    return tx.dehumidifier.update({
      where: { id: dehumidifierId },
      data: {
        status: 'normal',
        lastDefrostAt: new Date(),
      },
      include: {
        humidityRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { collectionBatches: { where: { status: 'in_stock' } } },
        },
      },
    });
  });
  
  return {
    dehumidifier: result,
    summary: buildDehumidifierSummary(result),
  };
}
