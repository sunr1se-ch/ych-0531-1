import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wind,
  Clock,
  Droplets,
  ThermometerSnowflake,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDateTime, formatHours, getStatusText, getStatusColor, calculateProgress } from '../utils/format';
import type { Dehumidifier } from '../types';

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'normal', label: '正常' },
  { value: 'pending_defrost', label: '待除霜' },
];

function DehumidifierCard({ dehumidifier }: { dehumidifier: Dehumidifier }) {
  const navigate = useNavigate();
  const isPending = dehumidifier.status === 'pending_defrost';
  const progress = calculateProgress(
    dehumidifier.hoursSinceLastDefrost,
    dehumidifier.defrostIntervalHours + 6
  );

  return (
    <div
      onClick={() => navigate(`/dehumidifier/${dehumidifier.id}`)}
      className={`relative p-6 bg-white rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isPending
          ? 'border-red-400 shadow-lg shadow-red-100 animate-pulse-slow'
          : 'border-slate-200 hover:border-teal-300'
      }`}
    >
      {isPending && (
        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full m-4 animate-ping" />
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPending ? 'bg-red-100' : 'bg-teal-100'
            }`}
          >
            {isPending ? (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            ) : (
              <Wind className="w-6 h-6 text-teal-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{dehumidifier.name}</h3>
            <p className="text-sm text-slate-500">{dehumidifier.code}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
            dehumidifier.status
          )}`}
        >
          {getStatusText(dehumidifier.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            <span>除霜间隔</span>
          </div>
          <p className="font-bold text-slate-900">{dehumidifier.defrostIntervalHours} 小时</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Droplets className="w-3 h-3" />
            <span>当前湿度</span>
          </div>
          <p
            className={`font-bold ${
              dehumidifier.latestHumidity && dehumidifier.latestHumidity > 58
                ? 'text-red-600'
                : 'text-slate-900'
            }`}
          >
            {dehumidifier.latestHumidity !== null
              ? `${dehumidifier.latestHumidity.toFixed(1)}%`
              : '--'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>距下次除霜</span>
          <span>
            {formatHours(dehumidifier.hoursSinceLastDefrost)} / {dehumidifier.defrostIntervalHours + 6} 小时
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress > 100 ? 'bg-red-500' : progress > 80 ? 'bg-amber-500' : 'bg-teal-500'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <ThermometerSnowflake className="w-3 h-3" />
            <span>{dehumidifier.coolingZone}</span>
          </div>
          <div>
            影响藏品：<span className="font-medium text-slate-700">{dehumidifier.affectedBatches} 批</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
        上次除霜：{formatDateTime(dehumidifier.lastDefrostAt)}
      </div>
    </div>
  );
}

export default function DehumidifierList() {
  const { dehumidifiers, loading, fetchDehumidifiers, selectedStatusFilter, setStatusFilter } =
    useStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDehumidifiers();
  }, [fetchDehumidifiers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDehumidifiers();
    setRefreshing(false);
  };

  const handleFilterChange = async (status: string) => {
    setStatusFilter(status);
    await fetchDehumidifiers(status);
  };

  const pendingCount = dehumidifiers.filter((d) => d.status === 'pending_defrost').length;
  const normalCount = dehumidifiers.filter((d) => d.status === 'normal').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Noto Serif SC, serif' }}>
            除湿机列表
          </h1>
          <p className="text-slate-500 mt-1">监控所有除湿机运行状态，及时处理待除霜设备</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-white rounded-lg border border-slate-200">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedStatusFilter === option.value
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option.label}
                {option.value === 'pending_defrost' && pendingCount > 0 && (
                  <span className="ml-1 text-red-500">({pendingCount})</span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-6 bg-white rounded-xl border-2 border-slate-200 animate-pulse"
            >
              <div className="h-12 bg-slate-200 rounded-lg mb-4" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))
        ) : dehumidifiers.length > 0 ? (
          dehumidifiers.map((dehumidifier) => (
            <DehumidifierCard key={dehumidifier.id} dehumidifier={dehumidifier} />
          ))
        ) : (
          <div className="col-span-full py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wind className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">暂无除湿机数据</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Wind className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">设备总数</p>
              <p className="text-2xl font-bold text-slate-900">{dehumidifiers.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">运行正常</p>
              <p className="text-2xl font-bold text-emerald-600">{normalCount}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">待除霜</p>
              <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
