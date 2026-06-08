import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Wind,
  Clock,
  Archive,
  PlusCircle,
  Menu,
  X,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { useStore } from '../store/useStore';

const navItems = [
  { path: '/', label: '除湿机列表', icon: Wind },
  { path: '/inspection', label: '巡检工作台', icon: ClipboardList },
  { path: '/defrost-todo', label: '待除霜待办', icon: Clock, badge: true },
  { path: '/collections', label: '藏品批次', icon: Archive },
  { path: '/data-entry', label: '数据录入', icon: PlusCircle },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { defrostTodos, fetchDefrostTodos } = useStore();

  const pendingCount = defrostTodos.length;

  useEffect(() => {
    fetchDefrostTodos();
  }, [fetchDefrostTodos]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-800">
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Noto Serif SC, serif' }}>
                恒温恒湿档案室
              </h1>
              <p className="text-sm text-slate-400 mt-1">除湿机监控与藏品管理系统</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && pendingCount > 0 && (
                      <span className="ml-auto flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {pendingCount > 0 && (
              <div className="p-4 m-4 rounded-lg bg-red-950/50 border border-red-900/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">
                      {pendingCount} 台设备待除霜
                    </p>
                    <p className="text-xs text-red-400/80 mt-1">
                      请及时处理，避免藏品损坏
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between lg:justify-end">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>
            
            <div className="hidden lg:block">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>当前用户：</span>
                <span className="font-medium text-slate-700">系统管理员</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
