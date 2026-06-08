import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Droplets,
  ThermometerSnowflake,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Snowflake,
  User,
  Calendar,
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
import { formatDateTime, formatHours, getStatusText, getStatusColor } from '../utils/format';
import { useStore } from '../store/useStore';
import type { Dehumidifier, HumidityRecord, DefrostHistory } from '../types';

interface HumidityChartData {
  time: string;
  humidity: number;
  isHigh: boolean;
}

export default function DehumidifierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { systemConfig } = useStore();
  const [dehumidifier, setDehumidifier] = useState<(Dehumidifier & { defrostHistories: DefrostHistory[]; humidityData: HumidityRecord[] }) | null>(null);
  const [humidityData, setHumidityData] = useState<HumidityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [remark, setRemark] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const humidityThreshold = systemConfig?.humidityThreshold ?? 58;
  const consecutiveHighCount = systemConfig?.consecutiveHighCount ?? 3;

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.dehumidifiers.get(parseInt(id));
      setDehumidifier(res.data);
      setHumidityData(res.data.humidityData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleConfirmDefrost = async () => {
    if (!id || !operatorName.trim()) return;
    setConfirmLoading(true);
    try {
      await api.dehumidifiers.confirmDefrost(parseInt(id), operatorName.trim(), remark.trim() || undefined);
      setShowConfirmModal(false);
      setOperatorName('');
      setRemark('');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const chartData: HumidityChartData[] = humidityData.map((record) => ({
    time: new Date(record.recordedAt).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    humidity: record.humidity,
    isHigh: record.humidity > humidityThreshold,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: HumidityChartData }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm text-slate-500">{label}</p>
          <p
            className={`text-lg font-bold ${
              data.humidity > humidityThreshold ? 'text-red-600' : 'text-teal-600'
            }`}
          >
            {data.humidity.toFixed(1)}%
          </p>
          {data.humidity > humidityThreshold && (
            <p className="text-xs text-red-500 mt-1">超出阈值</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dehumidifier) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">未找到该除湿机信息</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg"
        >
          返回列表
        </button>
      </div>
    );
  }

  const isPending = dehumidifier.status === 'pending_defrost';
  const consecutiveHigh = dehumidifier.consecutiveHighHumidity;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Noto Serif SC, serif' }}>
            {dehumidifier.name}
          </h1>
          <p className="text-slate-500 mt-1">{dehumidifier.code} · {dehumidifier.coolingZone}</p>
        </div>
        <span
          className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(
            dehumidifier.status
          )}`}
        >
          {getStatusText(dehumidifier.status)}
        </span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                <Droplets className="w-5 h-5 inline mr-2 text-teal-600" />
                湿度趋势（最近72小时）
              </h2>
              <div className="text-sm text-slate-500">
                阈值：<span className="font-medium text-red-600">{humidityThreshold}%</span>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="time"
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[40, 70]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={humidityThreshold}
                    stroke="#EF4444"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `阈值 ${humidityThreshold}%`,
                      position: 'right',
                      fill: '#EF4444',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke="#0D9488"
                    strokeWidth={3}
                    fill="url(#colorHumidity)"
                    dot={(props: { cx: number; cy: number; payload: HumidityChartData }) => {
                      if (props.payload.humidity > humidityThreshold) {
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={4}
                            fill="#EF4444"
                            className="animate-pulse"
                          />
                        );
                      }
                      return null;
                    }}
                    activeDot={{ r: 6, fill: '#0D9488', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              <Snowflake className="w-5 h-5 inline mr-2 text-teal-600" />
              除霜历史记录
            </h2>
            {dehumidifier.defrostHistories.length > 0 ? (
              <div className="space-y-3">
                {dehumidifier.defrostHistories.map((history) => (
                  <div
                    key={history.id}
                    className="p-4 bg-slate-50 rounded-lg flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">除霜完成</p>
                        <span className="text-sm text-slate-500">
                          {formatDateTime(history.completedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {history.operatorName}
                        </span>
                      </div>
                      {history.remark && (
                        <p className="mt-2 text-sm text-slate-600 bg-white p-2 rounded">
                          {history.remark}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">暂无除霜历史记录</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div
            className={`p-6 rounded-xl border-2 ${
              isPending
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">设备状态</h2>
            
            {isPending && (
              <div className="mb-4 p-4 bg-red-100 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-800">待除霜预警</p>
                    <p className="text-sm text-red-600 mt-1">
                      该设备已超过计划除霜间隔，且连续 {consecutiveHigh} 次湿度高于 {humidityThreshold}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">除霜间隔</span>
                <span className="font-medium text-slate-900">{dehumidifier.defrostIntervalHours} 小时</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">距上次除霜</span>
                <span className={`font-medium ${isPending ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatHours(dehumidifier.hoursSinceLastDefrost)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">当前湿度</span>
                <span
                  className={`font-medium ${
                    dehumidifier.latestHumidity && dehumidifier.latestHumidity > humidityThreshold
                      ? 'text-red-600'
                      : 'text-slate-900'
                  }`}
                >
                  {dehumidifier.latestHumidity !== null
                    ? `${dehumidifier.latestHumidity.toFixed(1)}%`
                    : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">连续高湿次数</span>
                <span
                  className={`font-medium ${consecutiveHigh >= consecutiveHighCount ? 'text-red-600' : 'text-slate-900'}`}
                >
                  {consecutiveHigh} 次
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500">影响藏品批次</span>
                <span className="font-medium text-slate-900">{dehumidifier.affectedBatches} 批</span>
              </div>
            </div>

            {isPending && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full mt-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Snowflake className="w-5 h-5" />
                确认除霜完成
              </button>
            )}
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              <Calendar className="w-5 h-5 inline mr-2 text-teal-600" />
              上次除霜
            </h2>
            <p className="text-slate-900 font-medium">
              {formatDateTime(dehumidifier.lastDefrostAt)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {formatHours(dehumidifier.hoursSinceLastDefrost)} 前
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              <ThermometerSnowflake className="w-5 h-5 inline mr-2 text-teal-600" />
              制冷区间
            </h2>
            <p className="text-slate-900 font-medium">{dehumidifier.coolingZone}</p>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">确认除霜完成</h3>
            <p className="text-slate-500 mb-6">
              确认 {dehumidifier.name} 除霜已完成，将解除待除霜状态并恢复该区间藏品出库权限。
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  操作人姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="请输入操作人姓名"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  备注
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="选填：除霜情况说明"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDefrost}
                disabled={!operatorName.trim() || confirmLoading}
                className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {confirmLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '确认'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
