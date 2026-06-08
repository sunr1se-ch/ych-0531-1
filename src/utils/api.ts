import type {
  Dehumidifier,
  HumidityRecord,
  DefrostHistory,
  CollectionBatch,
  DefrostTodoItem,
  ApiResponse,
  OutboundCheckResult,
  OutboundResult,
  InspectionRecord,
  InspectionWorkbenchItem,
  InspectionWorkbenchDetail,
  SystemConfig,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || '请求失败');
  }
  
  return data;
}

export const api = {
  config: {
    get: () =>
      request<ApiResponse<SystemConfig>>(`/config`),
  },

  dehumidifiers: {
    list: (status?: string) => 
      request<ApiResponse<Dehumidifier[]>>(
        `/dehumidifiers${status ? `?status=${status}` : ''}`
      ),
    
    get: (id: number) =>
      request<ApiResponse<Dehumidifier & { defrostHistories: DefrostHistory[]; humidityData: HumidityRecord[] }>>(
        `/dehumidifiers/${id}`
      ),
    
    getHumidity: (id: number, hours: number = 72) =>
      request<ApiResponse<HumidityRecord[]>>(
        `/dehumidifiers/${id}/humidity?hours=${hours}`
      ),
    
    confirmDefrost: (id: number, operatorName: string, remark?: string) =>
      request<ApiResponse<Dehumidifier>>(
        `/dehumidifiers/${id}/confirm-defrost`,
        {
          method: 'POST',
          body: JSON.stringify({ operatorName, remark }),
        }
      ),
  },
  
  humidity: {
    create: (dehumidifierId: number, humidity: number, recordedAt?: string) =>
      request<ApiResponse<HumidityRecord>>(
        `/humidity`,
        {
          method: 'POST',
          body: JSON.stringify({ dehumidifierId, humidity, recordedAt }),
        }
      ),
  },
  
  defrostTodo: {
    list: () =>
      request<ApiResponse<DefrostTodoItem[]>>(`/defrost-todo`),
    
    batchConfirm: (ids: number[], operatorName: string, remark?: string) =>
      request<ApiResponse<Dehumidifier[]>>(
        `/defrost-todo/batch-confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ ids, operatorName, remark }),
        }
      ),
  },
  
  collections: {
    list: () =>
      request<ApiResponse<CollectionBatch[]>>(`/collections`),
    
    checkOutbound: (id: number) =>
      request<ApiResponse<OutboundCheckResult>>(
        `/collections/check-outbound-allowed/${id}`
      ),
    
    outbound: (id: number, operatorName: string, reason?: string) =>
      request<ApiResponse<OutboundResult>>(
        `/collections/${id}/outbound`,
        {
          method: 'POST',
          body: JSON.stringify({ operatorName, reason }),
        }
      ),
    
    inspect: (
      id: number,
      paperWarpMm: number,
      inspectionDate: string,
      inspectorName: string
    ) =>
      request<ApiResponse<InspectionRecord>>(
        `/collections/${id}/inspect`,
        {
          method: 'POST',
          body: JSON.stringify({ paperWarpMm, inspectionDate, inspectorName }),
        }
      ),
  },

  inspection: {
    getWorkbench: () =>
      request<ApiResponse<InspectionWorkbenchItem[]>>(`/inspection/workbench`),
    
    getDehumidifierDetail: (id: number) =>
      request<ApiResponse<InspectionWorkbenchDetail>>(
        `/inspection/dehumidifier/${id}/detail`
      ),
  },
};
