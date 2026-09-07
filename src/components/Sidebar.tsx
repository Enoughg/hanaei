import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  WalletCards,
  FileSpreadsheet,
  Settings,
  BarChart3,
  Building2,
  CircleDollarSign,
} from 'lucide-react';
import { ActiveTab, AppSettings } from '../types';
import { toPersianDigits } from '../utils/jalali';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  workersCount: number;
  activeWorkersCount: number;
  settings: AppSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  workersCount,
  activeWorkersCount,
  settings,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'داشبورد مدیریتی',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'workers' as ActiveTab,
      label: 'مدیریت کارگران',
      icon: Users,
      badge: `${toPersianDigits(activeWorkersCount)} فعال`,
    },
    {
      id: 'attendance' as ActiveTab,
      label: 'ثبت کارکرد ماهانه',
      icon: CalendarCheck2,
      badge: 'جدول',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'payments' as ActiveTab,
      label: 'پرداخت‌ها و مساعده',
      icon: WalletCards,
      badge: null,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'گزارش‌های آماری',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'excel' as ActiveTab,
      label: 'خروجی اکسل (Excel)',
      icon: FileSpreadsheet,
      badge: 'RTL',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'settings' as ActiveTab,
      label: 'تنظیمات سامانه',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col border-l border-slate-800 shrink-0 h-screen select-none sticky top-0 shadow-sm z-20">
      {/* App Branding */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2.5">
          <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
            HR
          </span>
          <span className="truncate">{settings.workshopName || 'سامانه مدیریت کارگاه'}</span>
        </h1>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          سامانه مدیریت کارگران و دستمزد
        </p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-sm ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {isActive ? (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                ) : (
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md border ${
                    item.badgeColor || (isActive ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Summary Pill & Manager */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {settings.managerName ? settings.managerName.slice(0, 2) : 'مد'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">
              {settings.managerName || 'مدیر سیستم'}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
              <span>{toPersianDigits(workersCount)} کارگر ثبت‌شده</span>
              <span className="text-emerald-400 font-medium">آفلاین</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
