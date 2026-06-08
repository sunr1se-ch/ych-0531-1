import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Snowflake,
  Clock,
  Droplets,
  Archive,
  CheckSquare,
  Square,
  RefreshCw,
  User,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { formatDateTime, formatHours } from '../utils/format';

export default function DefrostTodo() {
  const navigate = useNavigate();
  const { defrostTodos, fetchDefrostTodos, loading, refreshAll } = useStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [remark, setRemark] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDefrostTodos();
  }, [fetchDefrostTodos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDefrostTodos();
    setRefreshing(false);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === defrostTodos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(defrostTodos.map((t) => t.dehumidifier.id));
    }
  };

  const handleBatchConfirm = async () => {
    if (!operatorName.trim() || selectedIds.length === 0) return;
    setConfirmLoading(true);
    try {
      await api.defrostTodo.batchConfirm(
        selectedIds,
        operatorName.trim(),
        remark.trim() || undefined
      );
      setShowBatchConfirm(false);
      setSelectedIds([]);
      setOperatorName('');
      setRemark('');
      await refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSingleConfirm = async (id: number) => {
    const name = prompt('请输入操作人姓名：');
    if (!name?.trim()) return;
    try {
      await api.dehumidifiers.confirmDefrost(id, name.trim());
      await refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

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
            待除霜待办
          </h1>
          <p className="text-slate-500 mt-1">
            {defrostTodos.length > 0
              ? `当前有 ${defrostTodos.length} 台设备需要除霜，请及时处理`
              : '暂无待除霜设备'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {defrostTodos.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">重要提醒</p>
              <p className="text-sm text-red-600 mt-1">
                待除霜设备制冷区间内的藏品批次不得正常出库。如强行出库，将被标记为「风险出库」并记录操作日志。
              </p>
            </div>
          </div>
        </div>
      )}

      {defrostTodos.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="p-1 hover:bg-slate-100 rounded"
            >
              {selectedIds.length === defrostTodos.length ? (
                <CheckSquare className="w-5 h-5 text-teal-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <span className="text-slate-600">
              已选择 <span className="font-semibold text-slate-900">{selectedIds.length}</span> /{' '}
              {defrostTodos.length} 项
            </span>
          </div>
          <button
            onClick={() => setShowBatchConfirm(true)}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Snowflake className="w-4 h-4" />
            批量确认除霜完成
          </button>
        </div>
      )}

      <div className="space-y-4">
        {defrostTodos.map((todo) => {
          const isSelected = selectedIds.includes(todo.dehumidifier.id);
          const urgencyLevel =
            todo.hoursOverdue > 12
              ? 'critical'
              : todo.hoursOverdue > 6
              ? 'high'
              : 'medium';

          const urgencyColors = {
            critical: 'border-red-500 bg-red-50',
            high: 'border-orange-400 bg-orange-50',
            medium: 'border-amber-400 bg-amber-50',
          };

          const urgencyText = {
            critical: '紧急',
            high: '高',
            medium: '中',
          };

          return (
            <div
              key={todo.dehumidifier.id}
              className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                isSelected
                  ? `${urgencyColors[urgencyLevel]} ring-2 ring-red-400 ring-offset-2`
                  : `${urgencyColors[urgencyLevel]} hover:shadow-lg`
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleSelect(todo.dehumidifier.id)}
                  className="mt-1 p-1 hover:bg-white/50 rounded transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-red-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">
                          {todo.dehumidifier.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            urgencyLevel === 'critical'
                              ? 'bg-red-200 text-red-800'
                              : urgencyLevel === 'high'
                              ? 'bg-orange-200 text-orange-800'
                              : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {urgencyText[urgencyLevel]}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1">
                        {todo.dehumidifier.code} · {todo.dehumidifier.coolingZone}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/dehumidifier/${todo.dehumidifier.id}`)}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                      查看详情 →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-white/80 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Clock className="w-3 h-3" />
                        <span>超时时长</span>
                      </div>
                      <p className="font-bold text-red-600">
                        {formatHours(todo.hoursOverdue)}
                      </p>
                    </div>
                    <div className="p-3 bg-white/80 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Droplets className="w-3 h-3" />
                        <span>连续高湿</span>
                      </div>
                      <p className="font-bold text-red-600">
                        {todo.consecutiveHighHumidity} 次
                      </p>
                    </div>
                    <div className="p-3 bg-white/80 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Archive className="w-3 h-3" />
                        <span>影响藏品</span>
                      </div>
                      <p className="font-bold text-slate-900">
                        {todo.affectedBatches} 批
                      </p>
                    </div>
                    <div className="p-3 bg-white/80 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <User className="w-3 h-3" />
                        <span>上次除霜</span>
                      </div>
                      <p className="font-medium text-slate-900 text-sm">
                        {formatDateTime(todo.dehumidifier.lastDefrostAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4 pt-4 border-t border-slate-200/50">
                    <button
                      onClick={() => handleSingleConfirm(todo.dehumidifier.id)}
                      className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Snowflake className="w-4 h-4" />
                      确认除霜完成
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {defrostTodos.length === 0 && (
        <div className="py-16 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Snowflake className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mt-4">
            所有设备运行正常
          </h3>
          <p className="text-slate-500 mt-2">
            暂无待除霜设备，请继续保持监控
          </p>
        </div>
      )}

      {showBatchConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              批量确认除霜完成
            </h3>
            <p className="text-slate-500 mb-6">
              确认已选中的 {selectedIds.length} 台设备除霜完成，将解除待除霜状态并恢复这些区间藏品的出库权限。
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
                onClick={() => setShowBatchConfirm(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchConfirm}
                disabled={!operatorName.trim() || confirmLoading}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
