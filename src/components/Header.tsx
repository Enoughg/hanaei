import React from 'react';
import {
  Calendar,
  Plus,
  UserPlus,
  Wallet,
  Clock,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { JALALI_MONTH_NAMES, toPersianDigits, getJalaliWeekdayName, getAvailableJalaliYears } from '../utils/jalali';
import { ActiveTab, AppSettings } from '../types';

interface HeaderProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  todayJalali: { year: number; month: number; day: number; formatted: string };
  settings: AppSettings;
  onOpenAddWorker: () => void;
  onOpenAddPayment: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  todayJalali,
  settings,
  onOpenAddWorker,
  onOpenAddPayment,
  setActiveTab,
  onLogout,
}) => {
  const years = getAvailableJalaliYears(1400, 1450);
  const todayWeekday = getJalaliWeekdayName(todayJalali.year, todayJalali.month, todayJalali.day);

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shadow-xs sticky top-0 z-10 gap-4">
      {/* Title & Date Info */}
      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
          <span>پنل جامع مدیریت کارکرد</span>
          <span className="text-blue-600 font-semibold">- {JALALI_MONTH_NAMES[selectedMonth - 1]} {toPersianDigits(selectedYear)}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>امروز: {todayWeekday} {toPersianDigits(todayJalali.day)} {JALALI_MONTH_NAMES[todayJalali.month - 1]} {toPersianDigits(todayJalali.year)}</span>
        </p>
      </div>

      {/* Period Selector & Quick Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="relative">
            <div className="flex items-center bg-slate-100 rounded-lg px-2.5 py-1 text-xs sm:text-sm border border-slate-200">
              <span className="ml-1.5 text-slate-400 font-normal">ماه:</span>
              <select
                id="header-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                aria-label="انتخاب ماه"
                className="appearance-none bg-transparent text-slate-800 font-bold text-xs sm:text-sm pr-1 pl-5 border-none focus:outline-none cursor-pointer"
              >
                {JALALI_MONTH_NAMES.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
            </div>
          </div>

          {/* Year Selector */}
          <div className="relative">
            <div className="flex items-center bg-slate-100 rounded-lg px-2.5 py-1 text-xs sm:text-sm border border-slate-200">
              <span className="ml-1.5 text-slate-400 font-normal">سال:</span>
              <select
                id="header-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="انتخاب سال"
                className="appearance-none bg-transparent text-slate-800 font-bold text-xs sm:text-sm pr-1 pl-5 border-none focus:outline-none cursor-pointer font-mono"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {toPersianDigits(yr)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <button
          id="btn-quick-attendance"
          onClick={() => setActiveTab('attendance')}
          className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 transition cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>ثبت کارکرد</span>
        </button>

        <button
          id="btn-quick-add-payment"
          onClick={onOpenAddPayment}
          className="hidden md:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer"
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          <span>ثبت پرداخت +</span>
        </button>

        <button
          id="btn-quick-add-worker"
          onClick={onOpenAddWorker}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>افزودن کارگر +</span>
        </button>

        {onLogout && settings?.authConfig?.isEnabled && (
          <button
            id="btn-header-lock"
            onClick={onLogout}
            title="قفل سامانه / خروج"
            className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
