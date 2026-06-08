export interface Dehumidifier {
  id: number;
  name: string;
  code: string;
  defrostIntervalHours: number;
  lastDefrostAt: string;
  status: 'normal' | 'pending_defrost';
  coolingZone: string;
  createdAt: string;
  latestHumidity: number | null;
  hoursSinceLastDefrost: number;
  consecutiveHighHumidity: number;
  affectedBatches: number;
}

export interface HumidityRecord {
  id: number;
  dehumidifierId: number;
  humidity: number;
  recordedAt: string;
}

export interface DefrostHistory {
  id: number;
  dehumidifierId: number;
  completedAt: string;
  operatorName: string;
  remark: string | null;
}

export interface InspectionRecord {
  id: number;
  collectionBatchId: number;
  paperWarpMm: number;
  inspectionDate: string;
  inspectorName: string;
  createdAt: string;
}

export interface OutboundLog {
  id: number;
  collectionBatchId: number;
  outboundAt: string;
  operatorName: string;
  isForceOutbound: boolean;
  forceReason: string | null;
}

export interface CollectionBatch {
  id: number;
  batchNo: string;
  name: string;
  dehumidifierId: number;
  status: 'in_stock' | 'out_of_stock';
  isRiskOutbound: boolean;
  riskReason: string | null;
  dehumidifier: {
    id: number;
    name: string;
    code: string;
    status: 'normal' | 'pending_defrost';
  };
  latestInspection: InspectionRecord | null;
  latestOutbound: OutboundLog | null;
}

export interface DefrostTodoItem {
  dehumidifier: Dehumidifier;
  hoursOverdue: number;
  consecutiveHighHumidity: number;
  affectedBatches: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  warning?: string;
}

export interface OutboundCheckResult {
  isAllowed: boolean;
  isOutOfStock: boolean;
  dehumidifierStatus: string;
  dehumidifierName: string;
  warning: string | null;
}

export interface OutboundResult {
  batch: CollectionBatch;
  isForceOutbound: boolean;
  warning: string | null;
}
