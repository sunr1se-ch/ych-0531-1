import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化演示数据...');

  await prisma.outboundLog.deleteMany();
  await prisma.inspectionRecord.deleteMany();
  await prisma.collectionBatch.deleteMany();
  await prisma.defrostHistory.deleteMany();
  await prisma.humidityRecord.deleteMany();
  await prisma.dehumidifier.deleteMany();

  console.log('🧹 已清空现有数据');

  const now = new Date();

  const dehumidifiers = await prisma.dehumidifier.createManyAndReturn({
    data: [
      {
        name: '一号除湿机',
        code: 'DH-001',
        defrostIntervalHours: 72,
        lastDefrostAt: new Date(now.getTime() - 80 * 3600000),
        status: 'pending_defrost',
        coolingZone: 'A区1-5列',
      },
      {
        name: '二号除湿机',
        code: 'DH-002',
        defrostIntervalHours: 72,
        lastDefrostAt: new Date(now.getTime() - 36 * 3600000),
        status: 'normal',
        coolingZone: 'A区6-10列',
      },
      {
        name: '三号除湿机',
        code: 'DH-003',
        defrostIntervalHours: 48,
        lastDefrostAt: new Date(now.getTime() - 55 * 3600000),
        status: 'normal',
        coolingZone: 'B区1-5列',
      },
    ],
  });

  console.log('✅ 已创建 3 台除湿机');

  const dh1 = dehumidifiers.find((d) => d.code === 'DH-001')!;
  const dh2 = dehumidifiers.find((d) => d.code === 'DH-002')!;
  const dh3 = dehumidifiers.find((d) => d.code === 'DH-003')!;

  const humidityRecords: Array<{
    dehumidifierId: number;
    humidity: number;
    recordedAt: Date;
  }> = [];

  for (let i = 1; i <= 72; i++) {
    const recordedAt = new Date(now.getTime() - (72 - i) * 3600000);
    
    const humidity1 = i < 70 ? 55 + Math.random() * 3 : 59 + Math.random() * 2;
    humidityRecords.push({
      dehumidifierId: dh1.id,
      humidity: Math.round(humidity1 * 100) / 100,
      recordedAt,
    });

    const humidity2 = 52 + Math.random() * 4;
    humidityRecords.push({
      dehumidifierId: dh2.id,
      humidity: Math.round(humidity2 * 100) / 100,
      recordedAt,
    });

    const humidity3 = 50 + Math.random() * 5;
    humidityRecords.push({
      dehumidifierId: dh3.id,
      humidity: Math.round(humidity3 * 100) / 100,
      recordedAt,
    });
  }

  await prisma.humidityRecord.createMany({ data: humidityRecords });
  console.log('✅ 已创建 216 条湿度记录（每台 72 小时）');

  const collections = await prisma.collectionBatch.createManyAndReturn({
    data: [
      { batchNo: 'BAT-2024-001', name: '清代古籍善本-经部', dehumidifierId: dh1.id },
      { batchNo: 'BAT-2024-002', name: '民国档案-政府公文', dehumidifierId: dh1.id },
      { batchNo: 'BAT-2024-003', name: '老照片集-1950s', dehumidifierId: dh2.id },
      { batchNo: 'BAT-2024-004', name: '地方志丛书-江南卷', dehumidifierId: dh2.id },
      { batchNo: 'BAT-2024-005', name: '名人手札-近代作家', dehumidifierId: dh3.id },
      { batchNo: 'BAT-2024-006', name: '报纸合订本-申报', dehumidifierId: dh3.id },
    ],
  });

  console.log('✅ 已创建 6 个藏品批次');

  await prisma.inspectionRecord.createMany({
    data: [
      { collectionBatchId: collections[0].id, paperWarpMm: 1.2, inspectionDate: new Date('2024-01-15'), inspectorName: '张三' },
      { collectionBatchId: collections[1].id, paperWarpMm: 0.8, inspectionDate: new Date('2024-01-16'), inspectorName: '李四' },
      { collectionBatchId: collections[2].id, paperWarpMm: 2.1, inspectionDate: new Date('2024-01-17'), inspectorName: '王五' },
      { collectionBatchId: collections[3].id, paperWarpMm: 0.5, inspectionDate: new Date('2024-01-18'), inspectorName: '张三' },
      { collectionBatchId: collections[4].id, paperWarpMm: 1.5, inspectionDate: new Date('2024-01-19'), inspectorName: '李四' },
      { collectionBatchId: collections[5].id, paperWarpMm: 1.0, inspectionDate: new Date('2024-01-20'), inspectorName: '王五' },
    ],
  });

  console.log('✅ 已创建 6 条抽检记录');

  await prisma.defrostHistory.createMany({
    data: [
      { dehumidifierId: dh1.id, completedAt: new Date(now.getTime() - 80 * 3600000), operatorName: '管理员A', remark: '常规除霜' },
      { dehumidifierId: dh1.id, completedAt: new Date(now.getTime() - 152 * 3600000), operatorName: '管理员B', remark: '定期维护' },
      { dehumidifierId: dh2.id, completedAt: new Date(now.getTime() - 36 * 3600000), operatorName: '管理员A', remark: '常规除霜' },
      { dehumidifierId: dh2.id, completedAt: new Date(now.getTime() - 108 * 3600000), operatorName: '管理员C', remark: '定期维护' },
      { dehumidifierId: dh3.id, completedAt: new Date(now.getTime() - 55 * 3600000), operatorName: '管理员B', remark: '常规除霜' },
      { dehumidifierId: dh3.id, completedAt: new Date(now.getTime() - 103 * 3600000), operatorName: '管理员A', remark: '定期维护' },
    ],
  });

  console.log('✅ 已创建 6 条除霜历史记录');

  console.log('\n🎉 演示数据初始化完成！');
  console.log('\n📋 演示数据概览：');
  console.log('  • 除湿机：3 台（1 台待除霜）');
  console.log('  • 湿度记录：216 条（过去 72 小时）');
  console.log('  • 藏品批次：6 个');
  console.log('  • 抽检记录：6 条');
  console.log('  • 除霜历史：6 条');
  console.log('\n🚀 现在可以启动服务了！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
