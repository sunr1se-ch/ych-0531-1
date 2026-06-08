import { useState, useEffect } from 'react';
import {
  PlusCircle,
  Droplets,
  FileText,
  Snowflake,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';

type TabType = 'humidity' | 'inspect' | 'defrost';

export default function DataEntry() {
  const { dehumidifiers, collections, refreshAll, fetchDehumidifiers, fetchCollections, systemConfig } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('humidity');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const humidityThreshold = systemConfig?.humidityThreshold ?? 58;

  const [humidityForm, setHumidityForm] = useState({
    dehumidifierId: '',
    humidity: '',
  });

  const [inspectForm, setInspectForm] = useState({
    collectionBatchId: '',
    paperWarpMm: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: '',
  });

  const [defrostForm, setDefrostForm] = useState({
    dehumidifierId: '',
    operatorName: '',
    remark: '',
  });

  useEffect(() => {
    fetchDehumidifiers();
    fetchCollections();
  }, [fetchDehumidifiers, fetchCollections]);

  const clearMessages = () => {
    setSuccess(null);
    setError(null);
  };

  const handleHumiditySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!humidityForm.dehumidifierId || !humidityForm.humidity) {
      setError('请填写完整信息');
      return;
    }

    const humidity = parseFloat(humidityForm.humidity);
    if (isNaN(humidity) || humidity < 0 || humidity > 100) {
      setError('请输入有效的湿度值（0-100）');
      return;
    }

    setLoading(true);
    try {
      await api.humidity.create(parseInt(humidityForm.dehumidifierId), humidity);
      setSuccess('湿度记录录入成功');
      setHumidityForm({ dehumidifierId: '', humidity: '' });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '录入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (
      !inspectForm.collectionBatchId ||
      !inspectForm.paperWarpMm ||
      !inspectForm.inspectionDate ||
      !inspectForm.inspectorName.trim()
    ) {
      setError('请填写完整信息');
      return;
    }

    const warpMm = parseFloat(inspectForm.paperWarpMm);
    if (isNaN(warpMm) || warpMm < 0) {
      setError('请输入有效的纸张翘曲毫米数');
      return;
    }

    setLoading(true);
    try {
      await api.collections.inspect(
        parseInt(inspectForm.collectionBatchId),
        warpMm,
        inspectForm.inspectionDate,
        inspectForm.inspectorName.trim()
      );
      setSuccess('抽检记录录入成功');
      setInspectForm({
        collectionBatchId: '',
        paperWarpMm: '',
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectorName: '',
      });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '录入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDefrostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!defrostForm.dehumidifierId || !defrostForm.operatorName.trim()) {
      setError('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      await api.dehumidifiers.confirmDefrost(
        parseInt(defrostForm.dehumidifierId),
        defrostForm.operatorName.trim(),
        defrostForm.remark.trim() || undefined
      );
      setSuccess('除霜完成确认成功');
      setDefrostForm({ dehumidifierId: '', operatorName: '', remark: '' });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '录入失败');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'humidity' as TabType, label: '湿度录入', icon: Droplets, color: 'teal' },
    { id: 'inspect' as TabType, label: '抽检登记', icon: FileText, color: 'amber' },
    { id: 'defrost' as TabType, label: '除霜确认', icon: Snowflake, color: 'red' },
  ];

  const pendingDehumidifiers = dehumidifiers.filter((d) => d.isPendingDefrost);
  const inStockCollections = collections.filter((c) => c.status === 'in_stock');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Noto Serif SC, serif' }}>
          数据录入
        </h1>
        <p className="text-slate-500 mt-1">录入湿度数据、抽检结果，确认除霜完成</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const colorClasses = {
              teal: isActive ? 'text-teal-600 border-teal-600 bg-teal-50' : 'text-slate-500 hover:text-slate-700',
              amber: isActive ? 'text-amber-600 border-amber-600 bg-amber-50' : 'text-slate-500 hover:text-slate-700',
              red: isActive ? 'text-red-600 border-red-600 bg-red-50' : 'text-slate-500 hover:text-slate-700',
            };

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  clearMessages();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${colorClasses[tab.color]}`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {tab.id === 'defrost' && pendingDehumidifiers.length > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-red-500 text-white">
                    {pendingDehumidifiers.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {activeTab === 'humidity' && (
            <form onSubmit={handleHumiditySubmit} className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择除湿机 <span className="text-red-500">*</span>
                </label>
                <select
                  value={humidityForm.dehumidifierId}
                  onChange={(e) => setHumidityForm({ ...humidityForm, dehumidifierId: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">请选择除湿机</option>
                  {dehumidifiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) - {d.coolingZone}
                      {d.status === 'pending_defrost' && ' ⚠️ 待除霜'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  相对湿度（%） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={humidityForm.humidity}
                  onChange={(e) => setHumidityForm({ ...humidityForm, humidity: e.target.value })}
                  placeholder="例如：55.5"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
                <p className="mt-1 text-sm text-slate-500">
                  阈值：{humidityThreshold}%，超过阈值可能触发待除霜预警
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    录入湿度数据
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'inspect' && (
            <form onSubmit={handleInspectSubmit} className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择藏品批次 <span className="text-red-500">*</span>
                </label>
                <select
                  value={inspectForm.collectionBatchId}
                  onChange={(e) => setInspectForm({ ...inspectForm, collectionBatchId: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">请选择藏品批次</option>
                  {inStockCollections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.batchNo} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  纸张翘曲毫米数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inspectForm.paperWarpMm}
                  onChange={(e) => setInspectForm({ ...inspectForm, paperWarpMm: e.target.value })}
                  placeholder="例如：1.5"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  抽检日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={inspectForm.inspectionDate}
                  onChange={(e) => setInspectForm({ ...inspectForm, inspectionDate: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  质检员姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inspectForm.inspectorName}
                  onChange={(e) => setInspectForm({ ...inspectForm, inspectorName: e.target.value })}
                  placeholder="请输入质检员姓名"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    登记抽检结果
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'defrost' && (
            <form onSubmit={handleDefrostSubmit} className="space-y-6 max-w-lg">
              {pendingDehumidifiers.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    当前有 {pendingDehumidifiers.length} 台设备待除霜：
                  </p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {pendingDehumidifiers.map((d) => (
                      <li key={d.id}>• {d.name} ({d.code})</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择除湿机 <span className="text-red-500">*</span>
                </label>
                <select
                  value={defrostForm.dehumidifierId}
                  onChange={(e) => setDefrostForm({ ...defrostForm, dehumidifierId: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">请选择除湿机</option>
                  {dehumidifiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                      {d.status === 'pending_defrost' && ' ⚠️ 待除霜'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  操作人姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={defrostForm.operatorName}
                  onChange={(e) => setDefrostForm({ ...defrostForm, operatorName: e.target.value })}
                  placeholder="请输入操作人姓名"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  备注
                </label>
                <textarea
                  value={defrostForm.remark}
                  onChange={(e) => setDefrostForm({ ...defrostForm, remark: e.target.value })}
                  placeholder="选填：除霜情况说明"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    确认除霜完成
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
