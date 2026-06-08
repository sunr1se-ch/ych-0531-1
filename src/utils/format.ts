export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatHours(hours: number): string {
  if (hours < 24) {
    return `${hours.toFixed(1)} 小时`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = (hours % 24).toFixed(1);
  return `${days} 天 ${remainingHours} 小时`;
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'normal':
      return '正常';
    case 'pending_defrost':
      return '待除霜';
    case 'in_stock':
      return '在库';
    case 'out_of_stock':
      return '已出库';
    default:
      return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'normal':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'pending_defrost':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'in_stock':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'out_of_stock':
      return 'text-slate-500 bg-slate-100 border-slate-200';
    default:
      return 'text-slate-700 bg-slate-50 border-slate-200';
  }
}

export function calculateProgress(current: number, total: number): number {
  return Math.min(100, Math.max(0, (current / total) * 100));
}
