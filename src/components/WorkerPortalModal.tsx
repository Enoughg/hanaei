import React, { useState } from 'react';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  AppSettings,
} from '../types';
import { calculateWorkerPayroll, calculateDailyWageBreakdown } from '../utils/payroll';
import {
  toPersianDigits,
  formatCurrency,
  formatHours,
  JALALI_MONTH_NAMES,
  getJalaliWeekdayName,
  getCurrentJalaliDate,
  isJalaliDateInRange,
  normalizeJalaliDate,
} from '../utils/jalali';
import { exportSingleWorkerRangeExcel } from '../services/excelExport';
import {
  FolderKanban,
  CalendarCheck2,
  Gift,
  WalletCards,
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Clock,
  CircleDollarSign,
  Phone,
  CreditCard,
  Briefcase,
  AlertTriangle,
  ChevronDown,
  Printer,
  X,
  Calendar,
  Layers,
} from 'lucide-react';
import { PayslipModal } from './PayslipModal';

interface WorkerPortalModalProps {
  worker: Worker;
  workRecords: WorkRecord[];
  adjustments: FinancialAdjustment[];
  payments: Payment[];
  settings: AppSettings;
  onClose: () => void;
  onSaveAdjustment: (adj: FinancialAdjustment) => void;
  onDeleteAdjustment: (id: string) => void;
  onSavePayment: (payment: Payment) => void;
  onDeletePayment: (id: string) => void;
  onOpenDailyWork: (worker: Worker, dayNumber: number, dateStr: string) => void;
}

export const WorkerPortalModal: React.FC<WorkerPortalModalProps> = ({
  worker,
  workRecords,
  adjustments,
  payments,
  settings,
  onClose,
  onSaveAdjustment,
  onDeleteAdjustment,
  onSavePayment,
  onDeletePayment,
  onOpenDailyWork,
}) => {
  const currentDate = getCurrentJalaliDate();
  
  // Date Filtering State: 'month' (default), 'range' (custom dates), 'all' (all history)
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'all'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.month); // 0 = all months, 1-12 = specific month
  const [startDate, setStartDate] = useState<string>(
    `${currentDate.year}/${String(currentDate.month).padStart(2, '0')}/01`
  );
  const [endDate, setEndDate] = useState<string>(currentDate.formatted);

  const [activeTab, setActiveTab] = useState<'attendance' | 'adjustments' | 'payments' | 'payslip'>('attendance');

  // Quick Adjustment Form State inside Portal
  const [adjTitle, setAdjTitle] = useState('پاداش عملکرد');
  const [adjCustomTitle, setAdjCustomTitle] = useState('');
  const [adjCategory, setAdjCategory] = useState<'addition' | 'deduction'>('addition');
  const [adjAmount, setAdjAmount] = useState<number>(200000);
  const [adjDate, setAdjDate] = useState(currentDate.formatted);
  const [adjNotes, setAdjNotes] = useState('');
  const [showAdjForm, setShowAdjForm] = useState(false);

  // Quick Payment Form State inside Portal
  const [payAmount, setPayAmount] = useState<number>(1000000);
  const [payDate, setPayDate] = useState(currentDate.formatted);
  const [payMethod, setPayMethod] = useState<Payment['method']>('bank_transfer');
  const [payTracking, setPayTracking] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);

  // Payslip Modal State
  const [showPayslipPrint, setShowPayslipPrint] = useState(false);

  const filterOptions = {
    year: filterMode === 'month' ? selectedYear : undefined,
    month: filterMode === 'month' && selectedMonth > 0 ? selectedMonth : undefined,
    startDate: filterMode === 'range' ? normalizeJalaliDate(startDate) : undefined,
    endDate: filterMode === 'range' ? normalizeJalaliDate(endDate) : undefined,
  };

  const payrollSummary = calculateWorkerPayroll(
    worker,
    workRecords,
    adjustments,
    payments,
    settings,
    filterOptions
  );

  // Worker's filtered records
  const workerRecords = workRecords
    .filter((r) => {
      if (r.workerId !== worker.id) return false;
      if (filterMode === 'range') {
        return isJalaliDateInRange(r.jalaliDate, startDate, endDate);
      }
      if (filterMode === 'month') {
        if (r.year !== selectedYear) return false;
        if (selectedMonth > 0 && r.month !== selectedMonth) return false;
      }
      return true;
    })
    .sort((a, b) => (a.jalaliDate > b.jalaliDate ? -1 : 1));

  // Worker's filtered adjustments
  const workerAdjustments = adjustments
    .filter((a) => {
      if (a.workerId !== worker.id) return false;
      if (filterMode === 'range') {
        return isJalaliDateInRange(a.jalaliDate, startDate, endDate);
      }
      if (filterMode === 'month') {
        if (a.year !== selectedYear) return false;
        if (selectedMonth > 0 && a.month !== selectedMonth) return false;
      }
      return true;
    })
    .sort((a, b) => (a.jalaliDate > b.jalaliDate ? -1 : 1));

  // Worker's filtered payments
  const workerPayments = payments
    .filter((p) => {
      if (p.workerId !== worker.id) return false;
      if (filterMode === 'range') {
        return isJalaliDateInRange(p.jalaliDate, startDate, endDate);
      }
      if (filterMode === 'month') {
        if (p.year !== selectedYear) return false;
        if (selectedMonth > 0 && p.month !== selectedMonth) return false;
      }
      return true;
    })
    .sort((a, b) => (a.jalaliDate > b.jalaliDate ? -1 : 1));

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || adjAmount <= 0) return;
    const finalTitle = adjTitle === 'سایر / عنوان دلخواه' ? adjCustomTitle || 'مورد مالی' : adjTitle;
    
    // Parse date parts
    const [y, m, d] = adjDate.split('/').map(Number);

    const newAdj: FinancialAdjustment = {
      id: `adj-${Date.now()}`,
      workerId: worker.id,
      jalaliDate: adjDate,
      year: y || selectedYear,
      month: m || (selectedMonth > 0 ? selectedMonth : 1),
      day: d || 1,
      title: finalTitle,
      type: adjTitle === 'سایر / عنوان دلخواه' ? 'custom' : adjCategory === 'addition' ? 'bonus' : 'penalty',
      category: adjCategory,
      amount: Number(adjAmount),
      notes: adjNotes,
      createdAt: new Date().toISOString(),
    };

    onSaveAdjustment(newAdj);
    setShowAdjForm(false);
    setAdjNotes('');
    setAdjCustomTitle('');
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) return;
    const [y, m] = payDate.split('/').map(Number);

    const newPay: Payment = {
      id: `pay-${Date.now()}`,
      workerId: worker.id,
      jalaliDate: payDate,
      year: y || selectedYear,
      month: m || (selectedMonth > 0 ? selectedMonth : 1),
      amount: Number(payAmount),
      method: payMethod,
      trackingNumber: payTracking,
      notes: payNotes,
      createdAt: new Date().toISOString(),
    };

    onSavePayment(newPay);
    setShowPayForm(false);
    setPayNotes('');
    setPayTracking('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-sm"
              style={{ backgroundColor: worker.avatarColor || '#2563eb' }}
            >
              {worker.fullName.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">{worker.fullName}</h2>
                <span className="bg-white text-slate-600 font-mono text-xs px-2 py-0.5 rounded border border-slate-200">
                  کد: {worker.code}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    worker.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {worker.isActive ? 'کارگر فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  {worker.role} ({worker.contractType})
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {toPersianDigits(worker.phone || '-')}
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  حساب: {worker.accountNumber || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterMode === 'month'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ماهانه
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('range')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'range'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>بازه دلخواه تاریخ</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                کل سوابق
              </button>
            </div>

            {/* Sub Controls according to Mode */}
            {filterMode === 'month' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs animate-fadeIn">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  aria-label="انتخاب ماه کارتابل"
                  className="bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={0}>تمام ماه‌ها (سالانه)</option>
                  {JALALI_MONTH_NAMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      ماه {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  aria-label="انتخاب سال کارتابل"
                  className="bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={1402}>۱۴۰۲</option>
                  <option value={1403}>۱۴۰۳</option>
                  <option value={1404}>۱۴۰۴</option>
                  <option value={1405}>۱۴۰۵</option>
                </select>
              </div>
            )}

            {filterMode === 'range' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px]">از:</span>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="1403/01/01"
                    className="w-24 bg-slate-50 text-slate-800 text-xs px-2 py-1 rounded-md border border-slate-200 font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px]">تا:</span>
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="1403/01/31"
                    className="w-24 bg-slate-50 text-slate-800 text-xs px-2 py-1 rounded-md border border-slate-200 font-mono text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Excel Export Button */}
            <button
              onClick={() =>
                exportSingleWorkerRangeExcel(worker, workRecords, adjustments, payments, settings, filterOptions)
              }
              title="خروجی اکسل کامل گزارش کارکرد و حقوق خالص این کارگر در بازه انتخابی"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>خروجی اکسل</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 p-2 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Summary Ribbon (بخش خلاصه مالی) */}
        <div className="bg-slate-50/50 px-6 py-3.5 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            {/* Base Rate */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">نرخ پایه دستمزد</div>
              <div className="font-bold text-xs text-slate-800 mt-1">
                {formatCurrency(worker.baseRate, settings.currencyUnit)}
              </div>
              <div className="text-[10px] text-slate-400">
                {worker.wageType === 'daily'
                  ? 'روزانه'
                  : worker.wageType === 'hourly'
                  ? 'ساعتی'
                  : 'ماهانه'}
              </div>
            </div>

            {/* Worked Hours */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">مجموع کارکرد</div>
              <div className="font-bold text-xs text-indigo-600 mt-1">
                {formatHours(payrollSummary.totalWorkedHours)}
              </div>
              <div className="text-[10px] text-indigo-500">
                {toPersianDigits(payrollSummary.workedDaysCount)} روز حضور
              </div>
            </div>

            {/* Base Salary */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">حقوق پایه کارکرد</div>
              <div className="font-bold text-xs text-slate-800 mt-1">
                {formatCurrency(payrollSummary.baseSalary, settings.currencyUnit)}
              </div>
            </div>

            {/* Overtime Pay */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">دستمزد اضافه کاری</div>
              <div className="font-bold text-xs text-indigo-600 mt-1">
                {formatCurrency(payrollSummary.overtimeSalary, settings.currencyUnit)}
              </div>
              <div className="text-[10px] text-indigo-500">
                {formatHours(payrollSummary.totalOvertimeHours)}
              </div>
            </div>

            {/* Bonuses & Additions */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">پاداش و مزایا</div>
              <div className="font-bold text-xs text-emerald-600 mt-1">
                +{formatCurrency(payrollSummary.totalAdditions, settings.currencyUnit)}
              </div>
            </div>

            {/* Fines & Deductions */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">جریمه و کسورات</div>
              <div className="font-bold text-xs text-rose-600 mt-1">
                -{formatCurrency(payrollSummary.totalDeductions, settings.currencyUnit)}
              </div>
            </div>

            {/* Total Paid */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">مجموع پرداختی</div>
              <div className="font-bold text-xs text-blue-600 mt-1">
                {formatCurrency(payrollSummary.totalPaid, settings.currencyUnit)}
              </div>
            </div>

            {/* Remaining Balance */}
            <div
              className={`p-2.5 rounded-lg border ${
                payrollSummary.remainingBalance > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <div className="text-[11px] font-semibold">مانده حساب (طلب)</div>
              <div className="font-bold text-xs mt-1">
                {formatCurrency(payrollSummary.remainingBalance, settings.currencyUnit)}
              </div>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>سوابق کارکرد ({toPersianDigits(workerRecords.length)})</span>
            </button>

            <button
              onClick={() => setActiveTab('adjustments')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'adjustments'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Gift className="w-4 h-4 text-amber-500" />
              <span>موارد مالی و پاداش/جریمه ({toPersianDigits(workerAdjustments.length)})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <WalletCards className="w-4 h-4 text-blue-500" />
              <span>سوابق پرداخت‌ها ({toPersianDigits(workerPayments.length)})</span>
            </button>

            <button
              onClick={() => setShowPayslipPrint(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>چاپ فیش حقوقی</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: ATTENDANCE RECORDS */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>جدول سوابق کارکرد روزانه کارگر</span>
                </h3>
                <span className="text-xs text-slate-500">
                  برای ویرایش یا ثبت جزئیات کارکرد هر روز، روی ردیف آن کلیک کنید
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">تاریخ</th>
                      <th className="py-3 px-3.5">روز هفته</th>
                      <th className="py-3 px-3.5 text-center">ورود</th>
                      <th className="py-3 px-3.5 text-center">خروج</th>
                      <th className="py-3 px-3.5 text-center">استراحت</th>
                      <th className="py-3 px-3.5 text-center">ساعات کار</th>
                      <th className="py-3 px-3.5 text-center">اضافه کاری</th>
                      <th className="py-3 px-3.5 text-center text-emerald-700">حقوق خالص روزانه</th>
                      <th className="py-3 px-3.5 text-center">وضعیت</th>
                      <th className="py-3 px-3.5">توضیحات</th>
                      <th className="py-3 px-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workerRecords.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500">
                          سابقه‌ای در این بازه زمانی یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      workerRecords.map((rec) => {
                        const weekday = getJalaliWeekdayName(rec.year, rec.month, rec.day);
                        const dayAdjs = adjustments.filter(
                          (a) => a.workerId === worker.id && (a.jalaliDate === rec.jalaliDate || (a.year === rec.year && a.month === rec.month && a.day === rec.day))
                        );
                        const dayWage = calculateDailyWageBreakdown(worker, rec, dayAdjs, settings);

                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-50 transition cursor-pointer"
                            onClick={() => onOpenDailyWork(worker, rec.day, rec.jalaliDate)}
                          >
                            <td className="py-2.5 px-3.5 font-mono text-slate-800 font-semibold">
                              {toPersianDigits(rec.jalaliDate)}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500">{weekday}</td>
                            <td className="py-2.5 px-3.5 text-center font-mono text-slate-700">
                              {rec.entryTime ? toPersianDigits(rec.entryTime) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-mono text-slate-700">
                              {rec.exitTime ? toPersianDigits(rec.exitTime) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-slate-500">
                              {rec.breakDurationMinutes > 0 ? `${toPersianDigits(rec.breakDurationMinutes)} د` : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-indigo-600">
                              {rec.workedHours > 0 ? formatHours(rec.workedHours) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-emerald-600">
                              {rec.overtimeHours > 0 ? formatHours(rec.overtimeHours) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-mono">
                              <div className="font-bold text-emerald-700 text-xs">
                                {formatCurrency(dayWage.netWage, settings.currencyUnit)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-sans flex items-center justify-center gap-1">
                                <span>پایه: {formatCurrency(dayWage.baseWage, settings.currencyUnit, false)}</span>
                                {dayWage.overtimeWage + dayWage.additions > 0 && (
                                  <span className="text-emerald-600">+{formatCurrency(dayWage.overtimeWage + dayWage.additions, settings.currencyUnit, false)}</span>
                                )}
                                {dayWage.deductions > 0 && (
                                  <span className="text-rose-500">-{formatCurrency(dayWage.deductions, settings.currencyUnit, false)}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  rec.status === 'full'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : rec.status === 'half'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : rec.status === 'holiday'
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : rec.status === 'leave'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : rec.status === 'absent'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                              >
                                {rec.status === 'full'
                                  ? 'کامل'
                                  : rec.status === 'half'
                                  ? 'نیمه‌وقت'
                                  : rec.status === 'holiday'
                                  ? 'تعطیل'
                                  : rec.status === 'leave'
                                  ? 'مرخصی'
                                  : rec.status === 'absent'
                                  ? 'غیبت'
                                  : 'مأموریت'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500 truncate max-w-xs">
                              {rec.notes || '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDailyWork(worker, rec.day, rec.jalaliDate);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                              >
                                ویرایش
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {workerRecords.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <tr>
                        <td colSpan={5} className="py-3 px-3.5 text-slate-800 text-xs">
                          مجموع حقوق و کارکرد بازه انتخابی ({toPersianDigits(workerRecords.length)} روز):
                        </td>
                        <td className="py-3 px-3.5 text-center text-indigo-600 font-mono text-xs">
                          {formatHours(payrollSummary.totalWorkedHours)}
                        </td>
                        <td className="py-3 px-3.5 text-center text-emerald-600 font-mono text-xs">
                          {formatHours(payrollSummary.totalOvertimeHours)}
                        </td>
                        <td className="py-3 px-3.5 text-center text-emerald-700 font-mono font-bold text-xs bg-emerald-50/80 border-x border-emerald-200">
                          {formatCurrency(payrollSummary.netSalary, settings.currencyUnit)}
                        </td>
                        <td colSpan={3} className="py-3 px-3.5 text-slate-500 text-[11px] font-normal">
                          مجموع حقوق خالص دوره
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL ADJUSTMENTS */}
          {activeTab === 'adjustments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500" />
                    <span>موارد مالی، پاداش‌ها، جریمه‌ها و مساعده‌ها</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    امکان ثبت انواع عناوین مالی با مبلغ دلخواه و تأثیر مستقیم در محاسبه حقوق
                  </p>
                </div>
                <button
                  onClick={() => setShowAdjForm(!showAdjForm)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت مورد مالی جدید</span>
                </button>
              </div>

              {/* Add Adjustment Form */}
              {showAdjForm && (
                <form
                  onSubmit={handleCreateAdjustment}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-fadeIn"
                >
                  <div className="font-bold text-xs text-amber-800 mb-2">
                    ثبت پاداش، جریمه، مساعده یا عنوان دلخواه برای {worker.fullName}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        عنوان مورد مالی
                      </label>
                      <select
                        value={adjTitle}
                        onChange={(e) => {
                          setAdjTitle(e.target.value);
                          if (
                            e.target.value.includes('جریمه') ||
                            e.target.value.includes('کسری') ||
                            e.target.value.includes('مساعده')
                          ) {
                            setAdjCategory('deduction');
                          } else {
                            setAdjCategory('addition');
                          }
                        }}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="پاداش عملکرد و کیفیت">پاداش عملکرد و کیفیت</option>
                        <option value="پاداش حضور و نظم">پاداش حضور و نظم</option>
                        <option value="کمک هزینه ایاب و ذهاب">کمک هزینه ایاب و ذهاب</option>
                        <option value="حق مسکن و بن کارگری">حق مسکن و بن کارگری</option>
                        <option value="مساعده میان‌دوره">مساعده میان‌دوره</option>
                        <option value="جریمه تأخیر یا خسارت">جریمه تأخیر یا خسارت</option>
                        <option value="کسری کار">کسری کار</option>
                        <option value="تسویه و علی‌الحساب">تسویه و علی‌الحساب</option>
                        <option value="سایر / عنوان دلخواه">سایر / عنوان دلخواه...</option>
                      </select>
                    </div>

                    {adjTitle === 'سایر / عنوان دلخواه' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          عنوان دلخواه شما <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="مثلاً: هزینه خرید ابزار، پاداش عید و..."
                          value={adjCustomTitle}
                          onChange={(e) => setAdjCustomTitle(e.target.value)}
                          className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ماهیت تراکنش
                      </label>
                      <select
                        value={adjCategory}
                        onChange={(e) => setAdjCategory(e.target.value as any)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="addition">افزایشی (اضافه به حقوق +)</option>
                        <option value="deduction">کاهشی (کسر از حقوق -)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        مبلغ ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'})
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        value={adjAmount}
                        onChange={(e) => setAdjAmount(Number(e.target.value))}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        تاریخ ثبت (شمسی)
                      </label>
                      <input
                        type="text"
                        required
                        value={adjDate}
                        onChange={(e) => setAdjDate(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        توضیحات و علت
                      </label>
                      <input
                        type="text"
                        placeholder="توضیحات تکمیلی در مورد علت پاداش یا جریمه..."
                        value={adjNotes}
                        onChange={(e) => setAdjNotes(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowAdjForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer"
                    >
                      ثبت و ذخیره
                    </button>
                  </div>
                </form>
              )}

              {/* Adjustments Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">تاریخ</th>
                      <th className="py-3 px-3.5">عنوان مورد مالی</th>
                      <th className="py-3 px-3.5 text-center">ماهیت</th>
                      <th className="py-3 px-3.5 text-center">مبلغ</th>
                      <th className="py-3 px-3.5">توضیحات</th>
                      <th className="py-3 px-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workerAdjustments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          مورد مالی یا پاداش/جریمه‌ای ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      workerAdjustments.map((adj) => {
                        const isAddition = adj.category === 'addition';
                        return (
                          <tr key={adj.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3.5 font-mono text-slate-700">
                              {toPersianDigits(adj.jalaliDate)}
                            </td>
                            <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                              {adj.title}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isAddition
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isAddition ? 'افزایشی (+)' : 'کاهشی (-)'}
                              </span>
                            </td>
                            <td
                              className={`py-2.5 px-3.5 text-center font-bold font-mono ${
                                isAddition ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isAddition ? '+' : '-'} {formatCurrency(adj.amount, settings.currencyUnit)}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500">{adj.notes || '-'}</td>
                            <td className="py-2.5 px-3.5 text-center">
                              <button
                                onClick={() => onDeleteAdjustment(adj.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS HISTORY */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <WalletCards className="w-4 h-4 text-blue-600" />
                    <span>تاریخچه پرداختی‌ها و تسویه‌حساب‌ها</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ثبت واریزهای دستمزد، مساعده‌ها و کارت‌به‌کارت‌های انجام‌شده
                  </p>
                </div>
                <button
                  onClick={() => setShowPayForm(!showPayForm)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت پرداخت جدید</span>
                </button>
              </div>

              {/* Add Payment Form */}
              {showPayForm && (
                <form
                  onSubmit={handleCreatePayment}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-fadeIn"
                >
                  <div className="font-bold text-xs text-blue-800 mb-2">
                    ثبت واریز دستمزد به حساب {worker.fullName}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        مبلغ پرداختی ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'}) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        value={payAmount}
                        onChange={(e) => setPayAmount(Number(e.target.value))}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        روش پرداخت
                      </label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="bank_transfer">واریز بانکی / حواله</option>
                        <option value="card_to_card">کارت به کارت</option>
                        <option value="paya_satna">پایا / ساتنا</option>
                        <option value="cash">نقدی</option>
                        <option value="check">چک بانکی</option>
                        <option value="other">سایر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        تاریخ پرداخت (شمسی)
                      </label>
                      <input
                        type="text"
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        شماره پیگیری / ارجاع بانکی
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: TRX-884210"
                        value={payTracking}
                        onChange={(e) => setPayTracking(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        بابت / توضیحات
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: تسویه حقوق نیمه اول ماه یا علی‌الحساب"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowPayForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                    >
                      ثبت پرداخت
                    </button>
                  </div>
                </form>
              )}

              {/* Payments Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">تاریخ</th>
                      <th className="py-3 px-3.5 text-center">مبلغ پرداختی</th>
                      <th className="py-3 px-3.5 text-center">روش پرداخت</th>
                      <th className="py-3 px-3.5 text-center">شماره پیگیری</th>
                      <th className="py-3 px-3.5">توضیحات</th>
                      <th className="py-3 px-3.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workerPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          پرداختی در این بازه ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      workerPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3.5 font-mono text-slate-700">
                            {toPersianDigits(pay.jalaliDate)}
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-bold text-blue-600 font-mono">
                            {formatCurrency(pay.amount, settings.currencyUnit)}
                          </td>
                          <td className="py-2.5 px-3.5 text-center text-slate-700">
                            {pay.method === 'bank_transfer'
                              ? 'واریز بانکی'
                              : pay.method === 'card_to_card'
                              ? 'کارت به کارت'
                              : pay.method === 'paya_satna'
                              ? 'پایا / ساتنا'
                              : pay.method === 'cash'
                              ? 'نقدی'
                              : pay.method === 'check'
                              ? 'چک'
                              : 'سایر'}
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                            {pay.trackingNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-500">{pay.notes || '-'}</td>
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              onClick={() => onDeletePayment(pay.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                              title="حذف پرداخت"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payslip Modal Generator */}
      {showPayslipPrint && (
        <PayslipModal
          worker={worker}
          summary={payrollSummary}
          settings={settings}
          year={selectedYear}
          month={selectedMonth > 0 ? selectedMonth : 1}
          onClose={() => setShowPayslipPrint(false)}
        />
      )}
    </div>
  );
};
