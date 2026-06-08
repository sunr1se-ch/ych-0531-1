import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  Snowflake,
  Droplets,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  User,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { api } from '../utils/api';
import { formatDateTime, formatHours, getStatusText, getStatusColor, formatDate } from '../utils/format';
import { useStore } from '../store/useStore';
import type { InspectionWorkbenchItem, InspectionWorkbenchDetail, InspectionBatch, HumidityRecord } from '../types';

const HUMIDITY_THRESHOLD = 58;

interface HumidityChartData {
  time: string;
  humidity: number;
  isHigh: boolean;
}

export default function InspectionWorkbench() {
  const { refreshAll } = useStore();
  const [devices, setDevices] = useState<InspectionWorkbenchItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<InspectionWorkbenchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showDefrostModal, setShowDefrostModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<InspectionBatch | null>(null);
  const [defrostOperator, setDefrostOperator] = useState('');
  const [defrostRemark, setDefrostRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [inspectData, setInspectData] = useState({
    paperWarpMm: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: '',
  });

  const fetchWorkbench = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.inspection.getWorkbench();
      setDevices(res.data);
      if (res.data.length > 0 && !selectedDevice) {
        fetchDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch workbench:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  const fetchDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.inspection.getDehumidifierDetail(id);
      setSelectedDevice(res.data);
    } catch (err) {
      console.error('Failed to fetch detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkbench();
  }, [fetchWorkbench]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWorkbench();
    if (selectedDevice) {
      await fetchDetail(selectedDevice.id);
    }
    setRefreshing(false);
  };

  const handleDeviceSelect = (device: InspectionWorkbenchItem) => {
    fetchDetail(device.id);
  };

  const handleConfirmDefrost = async () => {
    if (!selectedDevice || !defrostOperator.trim()) return;
    setActionLoading(true);
    try {
      await api.dehumidifiers.confirmDefrost(
        selectedDevice.id,
        defrostOperator.trim(),
        defrostRemark.trim() || undefined
      );
      setShowDefrostModal(false);
      setDefrostOperator('');
      setDefrostRemark('');
      alert('除霜确认成功');
      await Promise.all([fetchWorkbench(), refreshAll()]);
      if (selectedDevice) {
        await fetchDetail(selectedDevice.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspect = (batch: InspectionBatch) => {
    setSelectedBatch(batch);
    setInspectData({
      paperWarpMm: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectorName: '',
    });
    setShowInspectModal(true);
  };

  const handleSubmitInspect = async () => {
    if (
      !selectedBatch ||
      !inspectData.paperWarpMm ||
      !inspectData.inspectionDate ||
      !inspectData.inspectorName.trim()
    ) {
      alert('请填写完整的抽检信息');
      return;
    }

    const warpMm = parseFloat(inspectData.paperWarpMm);
    if (isNaN(warpMm) || warpMm < 0) {
      alert('请输入有效的纸张翘曲毫米数');
      return;
    }

    setActionLoading(true);
    try {
      await api.collections.inspect(
        selectedBatch.id,
        warpMm,
        inspectData.inspectionDate,
        inspectData.inspectorName.trim()
      );
      alert('抽检登记成功');
      setShowInspectModal(false);
      setSelectedBatch(null);
      if (selectedDevice) {
        await fetchDetail(selectedDevice.id);
      }
      await refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getUrgencyLevel = (device: InspectionWorkbenchItem) => {
    if (device.isPendingDefrost) {
      if (device.hoursOverdue > 12) return 'critical';
      if (device.hoursOverdue > 6) return 'high';
      return 'medium';
    }
    if (device.hoursOverdue > 12) return 'high';
    if (device.hoursOverdue > 6) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'border-red-500 bg-red-50 hover:bg-red-100';
      case 'high':
        return 'border-orange-400 bg-orange-50 hover:bg-orange-100';
      case 'medium':
        return 'border-amber-400 bg-amber-50 hover:bg-amber-100';
      default:
        return 'border-slate-200 bg-white hover:bg-slate-50';
    }
  };

  const getUrgencyBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return { text: '紧急', color: 'bg-red-200 text-red-800' };
      case 'high':
        return { text: '高', color: 'bg-orange-200 text-orange-800' };
      case 'medium':
        return { text: '中', color: 'bg-amber-200 text-amber-800' };
      default:
        return { text: '低', color: 'bg-slate-200 text-slate-700' };
    }
  };

  const chartData: HumidityChartData[] = selectedDevice?.humidityData.map((record: HumidityRecord) => ({
    time: new Date(record.recordedAt).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    humidity: record.humidity,
    isHigh: record.humidity > HUMIDITY_THRESHOLD,
  })) || [];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: HumidityChartData }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm text-slate-500">{label}</p>
          <p
            className={`text-lg font-bold ${
              data.humidity > HUMIDITY_THRESHOLD ? 'text-red-600' : 'text-teal-600'
            }`}
          >
            {data.humidity.toFixed(1)}%
          </p>
          {data.humidity > HUMIDITY_THRESHOLD && (
            <p className="text-xs text-red-500 mt-1">超出阈值</p>
          )}
        </div>
      );
    }
    return null;
  };

  const pendingCount = devices.filter(d => d.isPendingDefrost).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Noto Serif SC, serif' }}>
            巡检工作台
          </h1>
          <p className="text-slate-500 mt-1">
            按优先级完成设备巡检，{pendingCount > 0 ? `当前 ${pendingCount} 台设备待除霜` : '暂无待除霜设备'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">重要提醒</p>
              <p className="text-sm text-red-600 mt-1">
                待除霜设备制冷区间内的藏品批次不得正常出库。请优先处理待除霜设备。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        <div className="w-96 flex-shrink-0 overflow-hidden flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                设备巡检队列
                <span className="ml-auto text-sm font-normal text-slate-500">
                  共 {devices.length} 台
                </span>
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {devices.map((device) => {
                const urgency = getUrgencyLevel(device);
                const urgencyBadge = getUrgencyBadge(urgency);
                const isSelected = selectedDevice?.id === device.id;
                return (
                  <button
                    key={device.id}
                    onClick={() => handleDeviceSelect(device)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? `${getUrgencyColor(urgency)} ring-2 ring-teal-400 ring-offset-2`
                        : getUrgencyColor(urgency)
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{device.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${urgencyBadge.color}`}>
                          {urgencyBadge.text}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1' : ''} ${
                        device.isPendingDefrost ? 'text-red-500' : 'text-slate-400'
                      }`} />
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{device.code} · {device.coolingZone}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">超期</div>
                        <div className={`text-sm font-bold ${device.hoursOverdue > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {device.hoursOverdue > 0 ? formatHours(device.hoursOverdue) : '正常'}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">湿度</div>
                        <div className={`text-sm font-bold ${
                          device.latestHumidity && device.latestHumidity > HUMIDITY_THRESHOLD
                            ? 'text-red-600'
                            : 'text-teal-600'
                        }`}>
                          {device.latestHumidity !== null
                            ? `${device.latestHumidity.toFixed(1)}%`
                            : '--'}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-white/60 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">藏品</div>
                        <div className="text-sm font-bold text-slate-700">{device.affectedBatches} 批</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {detailLoading ? (
            <div className="flex items-center justify-center h-full bg-white rounded-xl border border-slate-200">
              <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : selectedDevice ? (
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedDevice.name}</h2>
                    <p className="text-sm text-slate-500">{selectedDevice.code} · {selectedDevice.coolingZone}</p>
                  </div>
                  <span
                    className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(
                      selectedDevice.status
                    )}`}
                  >
                    {getStatusText(selectedDevice.status)}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-teal-600" />
                      湿度趋势（近72小时）
                    </h3>
                    <div className="text-sm text-slate-500">
                      阈值：<span className="font-medium text-red-600">{HUMIDITY_THRESHOLD}%</span>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="miniColorHumidity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="time"
                          stroke="#94A3B8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          interval={Math.floor(chartData.length / 6)}
                        />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={[40, 70]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                          y={HUMIDITY_THRESHOLD}
                          stroke="#EF4444"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: '58%',
                            position: 'right',
                            fill: '#EF4444',
                            fontSize: 10,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="humidity"
                          stroke="#0D9488"
                          strokeWidth={2}
                          fill="url(#miniColorHumidity)"
                          dot={(props) => {
                            if (props.payload.humidity > HUMIDITY_THRESHOLD) {
                              return (
                                <circle
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={3}
                                  fill="#EF4444"
                                />
                              );
                            }
                            return null;
                          }}
                          activeDot={{ r: 5, fill: '#0D9488', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500 mb-1">除霜间隔</div>
                    <div className="font-semibold text-slate-900">{selectedDevice.defrostIntervalHours}h</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500 mb-1">距上次</div>
                    <div className={`font-semibold ${selectedDevice.isPendingDefrost ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatHours(selectedDevice.hoursSinceLastDefrost)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500 mb-1">连续高湿</div>
                    <div className={`font-semibold ${selectedDevice.consecutiveHighHumidity >= 3 ? 'text-red-600' : 'text-slate-900'}`}>
                      {selectedDevice.consecutiveHighHumidity} 次
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="text-xs text-slate-500 mb-1">超期</div>
                    <div className={`font-semibold ${selectedDevice.hoursOverdue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedDevice.hoursOverdue > 0 ? formatHours(selectedDevice.hoursOverdue) : '无'}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    在库藏品批次
                    <span className="text-sm font-normal text-slate-500">
                      ({selectedDevice.collectionBatches.length} 批)
                    </span>
                  </h3>
                  {selectedDevice.collectionBatches.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">批次编号</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">藏品名称</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">最近抽检</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDevice.collectionBatches.map((batch) => (
                            <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-medium text-slate-900">{batch.batchNo}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{batch.name}</td>
                              <td className="px-4 py-3">
                                {batch.latestInspection ? (
                                  <div>
                                    <div className="flex items-center gap-2 text-slate-700 text-sm">
                                      <span>翘曲：{batch.latestInspection.paperWarpMm.toFixed(1)} mm</span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatDate(batch.latestInspection.inspectionDate)}</span>
                                      <User className="w-3 h-3 ml-2" />
                                      <span>{batch.latestInspection.inspectorName}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-sm">暂无抽检记录</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleInspect(batch)}
                                  className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                >
                                  抽检登记
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center border border-slate-200 rounded-xl">
                      <p className="text-slate-500">暂无在库藏品批次</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>上次除霜：{formatDateTime(selectedDevice.lastDefrostAt)}</span>
                  </div>
                  {selectedDevice.isPendingDefrost && (
                    <button
                      onClick={() => setShowDefrostModal(true)}
                      className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Snowflake className="w-4 h-4" />
                      确认除霜完成
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-white rounded-xl border border-slate-200">
              <div className="text-center">
                <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">请选择一台设备查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDefrostModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">确认除霜完成</h3>
            <p className="text-slate-500 mb-6">
              确认 {selectedDevice.name} 除霜已完成，将解除待除霜状态并恢复该区间藏品出库权限。
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  操作人姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={defrostOperator}
                  onChange={(e) => setDefrostOperator(e.target.value)}
                  placeholder="请输入操作人姓名"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  备注
                </label>
                <textarea
                  value={defrostRemark}
                  onChange={(e) => setDefrostRemark(e.target.value)}
                  placeholder="选填：除霜情况说明"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDefrostModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDefrost}
                disabled={!defrostOperator.trim() || actionLoading}
                className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '确认'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInspectModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">抽检登记</h3>
            <p className="text-slate-500 mb-6">
              {selectedBatch.batchNo} · {selectedBatch.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  纸张翘曲毫米数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inspectData.paperWarpMm}
                  onChange={(e) => setInspectData({ ...inspectData, paperWarpMm: e.target.value })}
                  placeholder="例如：1.5"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  抽检日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={inspectData.inspectionDate}
                  onChange={(e) => setInspectData({ ...inspectData, inspectionDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  质检员姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inspectData.inspectorName}
                  onChange={(e) => setInspectData({ ...inspectData, inspectorName: e.target.value })}
                  placeholder="请输入质检员姓名"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInspectModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitInspect}
                disabled={actionLoading}
                className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '确认登记'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
