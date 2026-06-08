import prisma from '../lib/prisma.js';
import type { Dehumidifier, HumidityRecord } from '@prisma/client';

export const HUMIDITY_THRESHOLD = 58;
export const CONSECUTIVE_HIGH_COUNT = 3;
export const OVERDUE_HOURS = 6;

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

export async function updateDehumidifierStatusIfNeeded(
  dehumidifierId: number
): Promise<Dehumidifier> {
  const dehumidifier = await prisma.dehumidifier.findUniqueOrThrow({
    where: { id: dehumidifierId },
    include: {
      humidityRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
    },
  });
  
  const { isPending } = checkPendingDefrost(
    dehumidifier,
    dehumidifier.humidityRecords
  );
  
  const newStatus = isPending ? 'pending_defrost' : 'normal';
  
  if (dehumidifier.status !== newStatus) {
    return prisma.dehumidifier.update({
      where: { id: dehumidifierId },
      data: { status: newStatus },
    });
  }
  
  return dehumidifier;
}

export async function getDefrostTodoList() {
  const dehumidifiers = await prisma.dehumidifier.findMany({
    where: { status: 'pending_defrost' },
    include: {
      humidityRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
      collectionBatches: {
        where: { status: 'in_stock' },
      },
    },
  });
  
  return dehumidifiers.map((d) => {
    const checkResult = checkPendingDefrost(d, d.humidityRecords);
    return {
      dehumidifier: d,
      hoursOverdue: Math.max(0, checkResult.hoursSinceLastDefrost - d.defrostIntervalHours),
      consecutiveHighHumidity: checkResult.consecutiveHighHumidity,
      affectedBatches: d.collectionBatches.length,
    };
  });
}

export async function confirmDefrost(
  dehumidifierId: number,
  operatorName: string,
  remark?: string
) {
  return prisma.$transaction(async (tx) => {
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
    });
  });
}
