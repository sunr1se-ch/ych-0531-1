import { useEffect, useState } from 'react';
import {
  Archive,
  Package,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Clock,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { formatDate, formatDateTime, getStatusText, getStatusColor } from '../utils/format';
import type { CollectionBatch } from '../types';

export default function Collections() {
  const { collections, fetchCollections, loading, refreshAll } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<CollectionBatch | null>(null);
  const [showOutboundModal, setShowOutboundModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [outboundCheck, setOutboundCheck] = useState<{
    isAllowed: boolean;
    warning: string | null;
  } | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [outboundReason, setOutboundReason] = useState('');
  const [confirmStep, setConfirmStep] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const [inspectData, setInspectData] = useState({
    paperWarpMm: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: '',
  });

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCollections();
    setRefreshing(false);
  };

  const handleOutboundClick = async (batch: CollectionBatch) => {
    if (batch.status === 'out_of_stock') return;
    setSelectedBatch(batch);
    setConfirmStep(1);
    setOperatorName('');
    setOutboundReason('');
    setOutboundCheck(null);
    setShowOutboundModal(true);

    try {
      const res = await api.collections.checkOutbound(batch.id);
      setOutboundCheck(res.data);
    } catch (err) {
      console.error('Failed to check outbound:', err);
    }
  };

  const handleNextStep = () => {
    if (confirmStep === 1 && !operatorName.trim()) {
      alert('请输入操作人姓名');
      return;
    }
    if (confirmStep === 2 && !outboundCheck?.isAllowed && !outboundReason.trim()) {
      alert('强行出库必须填写原因');
      return;
    }
    if (confirmStep === 1 && outboundCheck?.isAllowed) {
      setConfirmStep(3);
      return;
    }
    if (confirmStep < 3) {
      setConfirmStep(confirmStep + 1);
    }
  };

  const handleConfirmOutbound = async () => {
    if (!selectedBatch || !operatorName.trim()) return;
    if (!outboundCheck?.isAllowed && !outboundReason.trim()) {
      alert('强行出库必须填写原因');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.collections.outbound(
        selectedBatch.id,
        operatorName.trim(),
        outboundReason.trim() || undefined
      );
      alert(res.data.warning || '出库登记成功');
      setShowOutboundModal(false);
      setSelectedBatch(null);
      await refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspect = async (batch: CollectionBatch) => {
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
      await refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const inStockCount = collections.filter((c) => c.status === 'in_stock').length;
  const outOfStockCount = collections.filter((c) => c.status === 'out_of_stock').length;
  const riskCount = collections.filter((c) => c.isRiskOutbound).length;

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
            藏品批次管理
          </h1>
          <p className="text-slate-500 mt-1">管理藏品批次信息，登记抽检结果与出库记录</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">批次总数</p>
              <p className="text-2xl font-bold text-slate-900">{collections.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">在库</p>
              <p className="text-2xl font-bold text-emerald-600">{inStockCount}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已出库</p>
              <p className="text-2xl font-bold text-slate-900">{outOfStockCount}</p>
              {riskCount > 0 && (
                <p className="text-xs text-red-500">含 {riskCount} 批风险出库</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">批次编号</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">藏品名称</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">所属区间</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">最新抽检</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">库存状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.map((batch) => (
                <tr
                  key={batch.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    batch.isRiskOutbound ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{batch.batchNo}</div>
                    {batch.isRiskOutbound && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        风险出库
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{batch.name}</td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700">{batch.dehumidifier.name}</div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                        batch.dehumidifier.status
                      )}`}
                    >
                      {getStatusText(batch.dehumidifier.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {batch.latestInspection ? (
                      <div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <FileText className="w-4 h-4 text-slate-400" />
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
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                        batch.status
                      )}`}
                    >
                      {batch.status === 'in_stock' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {getStatusText(batch.status)}
                    </span>
                    {batch.latestOutbound && (
                      <div className="mt-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDateTime(batch.latestOutbound.outboundAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInspect(batch)}
                        className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        抽检登记
                      </button>
                      <button
                        onClick={() => handleOutboundClick(batch)}
                        disabled={batch.status === 'out_of_stock'}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        出库登记
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {collections.length === 0 && (
          <div className="py-16 text-center">
            <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无藏品批次数据</p>
          </div>
        )}
      </div>

      {showOutboundModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">出库登记</h3>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-900">{selectedBatch.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedBatch.batchNo} · {selectedBatch.dehumidifier.name}
              </p>
            </div>

            {confirmStep >= 1 && (
              <div className={`space-y-4 transition-all ${confirmStep === 1 ? '' : 'opacity-50'}`}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    操作人姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="请输入操作人姓名"
                    disabled={confirmStep > 1}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            )}

            {confirmStep >= 2 && outboundCheck && !outboundCheck.isAllowed && (
              <div className="mt-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800">警告：强行出库风险</p>
                      <p className="text-sm text-red-600 mt-1">{outboundCheck.warning}</p>
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        此次出库将被标记为「风险出库」，并永久记录操作日志。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    强行出库原因 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={outboundReason}
                    onChange={(e) => setOutboundReason(e.target.value)}
                    placeholder="请详细说明强行出库的原因"
                    rows={3}
                    disabled={confirmStep > 2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            )}

            {confirmStep >= 3 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-800">请确认以下信息：</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  <li>• 操作人：{operatorName}</li>
                  <li>• 藏品：{selectedBatch.name}</li>
                  {!outboundCheck?.isAllowed && (
                    <li>• 强行出库原因：{outboundReason}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {confirmStep > 1 && (
                <button
                  onClick={() => setConfirmStep(confirmStep - 1)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  上一步
                </button>
              )}
              {confirmStep < 3 ? (
                <button
                  onClick={handleNextStep}
                  className={`flex-1 py-3 font-semibold rounded-lg transition-colors ${
                    outboundCheck?.isAllowed
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleConfirmOutbound}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : outboundCheck?.isAllowed ? (
                    '确认出库'
                  ) : (
                    '确认强行出库'
                  )}
                </button>
              )}
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
