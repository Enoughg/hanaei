import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CircleDollarSign,
  Gift,
  AlertTriangle,
  WalletCards,
  Scale,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  CalendarCheck2,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  AppSettings,
  ActiveTab,
} from '../types';
import { calculateWorkerPayroll } from '../utils/payroll';
import {
  toPersianDigits,
  formatCurrency,
  formatHours,
  JALALI_MONTH_NAMES,
} from '../utils/jalali';

interface DashboardViewProps {
  workers: Worker[];
  workRecords: WorkRecord[];
  adjustments: FinancialAdjustment[];
  payments: Payment[];
  settings: AppSettings;
  selectedYear: number;
  selectedMonth: number;
  onOpenWorkerPortal: (worker: Worker) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddPayment: () => void;
  onOpenAddWorker: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workers,
  workRecords,
  adjustments,
  payments,
  settings,
  selectedYear,
  selectedMonth,
  onOpenWorkerPortal,
  setActiveTab,
  onOpenAddPayment,
  onOpenAddWorker,
}) => {
  const monthName = JALALI_MONTH_NAMES[selectedMonth - 1];

  // Calculate summaries for all workers for the selected month/year
  const summaries = workers.map((w) =>
    calculateWorkerPayroll(w, workRecords, adjustments, payments, settings, {
      year: selectedYear,
      month: selectedMonth,
    })
  );

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.isActive).length;
  const inactiveWorkers = totalWorkers - activeWorkers;

  const totalWorkedHours = summaries.reduce((sum, s) => sum + s.totalWorkedHours, 0);
  const totalOvertimeHours = summaries.reduce((sum, s) => sum + s.totalOvertimeHours, 0);
  const totalGrossSalary = summaries.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalNetSalary = summaries.reduce((sum, s) => sum + s.netSalary, 0);
  const totalAdditions = summaries.reduce((sum, s) => sum + s.totalAdditions, 0);
  const totalDeductions = summaries.reduce((sum, s) => sum + s.totalDeductions, 0);
  const totalPaid = summaries.reduce((sum, s) => sum + s.totalPaid, 0);
  const totalRemainingBalance = summaries.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Recent payments for current month
  const recentPayments = payments
    .filter((p) => p.year === selectedYear && p.month === selectedMonth)
    .slice(0, 5);

  // Recent adjustments
  const recentAdjustments = adjustments
    .filter((a) => a.year === selectedYear && a.month === selectedMonth)
    .slice(0, 5);

  const workerMap = new Map<string, Worker>(workers.map((w) => [w.id, w]));

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-md font-semibold">
                گزارش عملکرد ماه {monthName} {toPersianDigits(selectedYear)}
              </span>
              <span className="text-xs text-slate-400">| داشبورد مدیریتی</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              خلاصه وضعیت کارکرد و حساب‌های کارگاه
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              محاسبه زنده بر اساس کارکردهای ثبت‌شده، پاداش‌ها، جریمه‌ها و مبالغ پرداختی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-dash-goto-matrix"
              onClick={() => setActiveTab('attendance')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>ورود به جدول کارکرد ماه</span>
            </button>
            <button
              id="btn-dash-goto-excel"
              onClick={() => setActiveTab('excel')}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>خروجی اکسل</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Statistics Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Total & Active Workers */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">تعداد کل کارگران</p>
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {toPersianDigits(totalWorkers)}{' '}
            <span className="text-xs font-normal text-slate-400">نفر</span>
          </h3>
          <div className="mt-2 text-xs flex items-center gap-3 text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              {toPersianDigits(activeWorkers)} فعال
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <UserX className="w-3.5 h-3.5" />
              {toPersianDigits(inactiveWorkers)} غیرفعال
            </span>
          </div>
        </div>

        {/* Total Worked Hours */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">مجموع ساعات کارکرد ماه</p>
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">
            {formatHours(totalWorkedHours)}
          </h3>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>شامل اضافه کاری:</span>
            <span className="font-semibold text-slate-700">{formatHours(totalOvertimeHours)}</span>
          </div>
        </div>

        {/* Gross / Base Salary */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">مجموع حقوق ناخالص</p>
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-blue-700">
            {formatCurrency(totalGrossSalary, settings.currencyUnit)}
          </h3>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>حقوق خالص نهایی:</span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(totalNetSalary, settings.currencyUnit)}
            </span>
          </div>
        </div>

        {/* Total Remaining Balance (Workshop Liability) */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">مانده بدهی به پرسنل</p>
            <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600">
            {formatCurrency(totalRemainingBalance, settings.currencyUnit)}
          </h3>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>وضعیت:</span>
            <span className="font-medium text-rose-600">
              {totalRemainingBalance >= 0 ? 'بدهی جاری کارگاه' : 'تسویه کامل'}
            </span>
          </div>
        </div>

        {/* Total Bonuses / Additions */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">مجموع پاداش‌ها و مزایا</p>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-amber-600">
            {formatCurrency(totalAdditions, settings.currencyUnit)}
          </h3>
          <div className="mt-2 text-xs text-amber-700/80 pt-2 border-t border-slate-100">
            افزایش‌دهنده به حقوق پایه
          </div>
        </div>

        {/* Total Deductions / Fines */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">مجموع کسورات و جریمه‌ها</p>
            <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600">
            {formatCurrency(totalDeductions, settings.currencyUnit)}
          </h3>
          <div className="mt-2 text-xs text-rose-600/80 pt-2 border-t border-slate-100">
            کسر از حقوق (جریمه، مساعده و...)
          </div>
        </div>

        {/* Total Payments Made */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm lg:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <p className="text-xs font-medium">مجموع پرداختی‌های ثبت‌شده این ماه</p>
            <div className="p-1.5 rounded-md bg-cyan-50 text-cyan-600">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-cyan-700">
              {formatCurrency(totalPaid, settings.currencyUnit)}
            </h3>
            <button
              onClick={onOpenAddPayment}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              ثبت پرداخت جدید +
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>تعداد پرداخت‌ها:</span>
            <span className="font-semibold text-slate-700">{toPersianDigits(recentPayments.length)} فقره</span>
          </div>
        </div>
      </div>

      {/* Workers Overview Table with One-Click Access to Worker Portal */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                کارتابل و خلاصه وضعیت کارگران ({monthName} {toPersianDigits(selectedYear)})
              </h3>
              <p className="text-xs text-slate-500">
                جهت مشاهده جزئیات سوابق، ثبت پاداش/جریمه و چاپ فیش حقوقی، روی نام کارگر کلیک کنید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddWorker}
              className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer font-medium"
            >
              + کارگر جدید
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
            >
              مشاهده همه
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">کارگر</th>
                <th className="py-3 px-4">شغل / سمت</th>
                <th className="py-3 px-4 text-center">نوع دستمزد</th>
                <th className="py-3 px-4 text-center">کارکرد ماه</th>
                <th className="py-3 px-4 text-center">حقوق نهایی</th>
                <th className="py-3 px-4 text-center">پرداخت شده</th>
                <th className="py-3 px-4 text-center">مانده حساب</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((summary) => {
                const { worker } = summary;
                return (
                  <tr
                    key={worker.id}
                    className="hover:bg-blue-50/40 transition group cursor-pointer"
                    onClick={() => onOpenWorkerPortal(worker)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs"
                          style={{ backgroundColor: worker.avatarColor || '#3b82f6' }}
                        >
                          {worker.fullName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{worker.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              #{worker.code}
                            </span>
                            {!worker.isActive && (
                              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-normal">
                                غیرفعال
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{worker.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium text-xs text-slate-800">{worker.role}</div>
                      <div className="text-[11px] text-slate-400">{worker.contractType}</div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                        {worker.wageType === 'daily'
                          ? 'روزمزد'
                          : worker.wageType === 'hourly'
                          ? 'ساعتی'
                          : 'ماهانه'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="font-bold text-indigo-700 text-xs">
                        {formatHours(summary.totalWorkedHours)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {toPersianDigits(summary.workedDaysCount)} روز حضور
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-800 text-xs">
                      {formatCurrency(summary.netSalary, settings.currencyUnit)}
                    </td>

                    <td className="py-3 px-4 text-center text-cyan-700 font-semibold text-xs">
                      {formatCurrency(summary.totalPaid, settings.currencyUnit)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          summary.remainingBalance > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : summary.remainingBalance === 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {formatCurrency(summary.remainingBalance, settings.currencyUnit)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenWorkerPortal(worker)}
                        className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-transparent px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <span>کارتابل</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: Recent Financial Adjustments & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Financial Adjustments */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                آخرین پاداش‌ها، جریمه‌ها و تعدیلات ({monthName})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
            >
              مشاهده همه
            </button>
          </div>

          {recentAdjustments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              مورد مالی یا پاداش/جریمه‌ای برای این ماه ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentAdjustments.map((adj) => {
                const w = workerMap.get(adj.workerId);
                const isAddition = adj.category === 'addition';
                return (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                        <span>{adj.title}</span>
                        <span className="text-slate-500 font-normal">({w?.fullName || 'کارگر'})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        تاریخ: {adj.jalaliDate} {adj.notes ? `| ${adj.notes}` : ''}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        isAddition ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {isAddition ? '+' : '-'} {formatCurrency(adj.amount, settings.currencyUnit)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <WalletCards className="w-5 h-5 text-cyan-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                آخرین پرداخت‌های دستمزد ({monthName})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('payments')}
              className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
            >
              مشاهده همه
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              پرداختی در این ماه ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPayments.map((pay) => {
                const w = workerMap.get(pay.workerId);
                return (
                  <div
                    key={pay.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                        <span>{w?.fullName || 'کارگر'}</span>
                        <span className="text-slate-500 font-normal">
                          ({pay.method === 'bank_transfer'
                            ? 'واریز بانکی'
                            : pay.method === 'card_to_card'
                            ? 'کارت به کارت'
                            : pay.method === 'cash'
                            ? 'نقدی'
                            : 'سایر'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        تاریخ: {pay.jalaliDate} {pay.trackingNumber ? `| پیگیری: ${pay.trackingNumber}` : ''}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-cyan-700">
                      {formatCurrency(pay.amount, settings.currencyUnit)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
