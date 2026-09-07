import React, { useState, useMemo, useEffect } from 'react';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  AppSettings,
  WorkerPayrollSummary,
} from '../types';
import { calculateWorkerPayroll } from '../utils/payroll';
import {
  toPersianDigits,
  formatCurrency,
  formatHours,
  JALALI_MONTH_NAMES,
  getCurrentJalaliDate,
  normalizeJalaliDate,
  isJalaliDateInRange,
  getJalaliWeekdayName,
  getDaysInJalaliMonth,
} from '../utils/jalali';
import {
  exportReferencePaymentExcel,
  exportCustomRangePayrollExcel,
  exportCustomRangeAttendanceExcel,
  exportFullCustomRangeWorkbookExcel,
} from '../services/excelExport';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  Users,
  CreditCard,
  Clock,
  ChevronDown,
  Layers,
  Sparkles,
  Download,
  Hash,
  ExternalLink,
  FileText,
} from 'lucide-react';

interface ReportsViewProps {
  workers: Worker[];
  workRecords: WorkRecord[];
  adjustments: FinancialAdjustment[];
  payments: Payment[];
  settings: AppSettings;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  onOpenWorkerPortal: (worker: Worker) => void;
}

type ReportTab = 'reference' | 'payroll' | 'attendance' | 'adjustments';
type WorkerFilterMode = 'all' | 'active_only' | 'single' | 'custom_multi';

export const ReportsView: React.FC<ReportsViewProps> = ({
  workers,
  workRecords,
  adjustments,
  payments,
  settings,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  onOpenWorkerPortal,
}) => {
  const currentDate = getCurrentJalaliDate();

  // Active Report Preview Tab
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('reference');

  // Arbitrary Date Range State (Defaults to full current selected month)
  const defaultStart = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}/01`;
  const defaultDaysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
  const defaultEnd = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}/${String(defaultDaysInMonth).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // Quick Preset Indicator
  const [activePreset, setActivePreset] = useState<string>('full_month');

  // Document Info
  const [documentNumber, setDocumentNumber] = useState<string>(
    `SANAD-${selectedYear}-${String(selectedMonth).padStart(2, '0')}${String(defaultDaysInMonth).padStart(2, '0')}`
  );
  const [documentDate, setDocumentDate] = useState<string>(defaultEnd);
  const [payableBasis, setPayableBasis] = useState<'net_balance' | 'net_salary'>('net_balance');

  // Worker Filtering State
  const [workerFilterMode, setWorkerFilterMode] = useState<WorkerFilterMode>('all');
  const [selectedSingleWorkerId, setSelectedSingleWorkerId] = useState<string>(workers[0]?.id || '');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(workers.map((w) => w.id));
  const [searchWorkerQuery, setSearchWorkerQuery] = useState<string>('');
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState<boolean>(false);

  // Sync dates when global year/month change (if user chooses preset full_month)
  useEffect(() => {
    if (activePreset === 'full_month') {
      const days = getDaysInJalaliMonth(selectedYear, selectedMonth);
      const s = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}/01`;
      const e = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}/${String(days).padStart(2, '0')}`;
      setStartDate(s);
      setEndDate(e);
      setDocumentDate(e);
      setDocumentNumber(`SANAD-${selectedYear}-${String(selectedMonth).padStart(2, '0')}${String(days).padStart(2, '0')}`);
    }
  }, [selectedYear, selectedMonth, activePreset]);

  // Keep selectedWorkerIds up to date if workers list changes
  useEffect(() => {
    if (workerFilterMode === 'all') {
      setSelectedWorkerIds(workers.map((w) => w.id));
    } else if (workerFilterMode === 'active_only') {
      setSelectedWorkerIds(workers.filter((w) => w.isActive).map((w) => w.id));
    } else if (workerFilterMode === 'single') {
      if (selectedSingleWorkerId) {
        setSelectedWorkerIds([selectedSingleWorkerId]);
      } else if (workers.length > 0) {
        setSelectedSingleWorkerId(workers[0].id);
        setSelectedWorkerIds([workers[0].id]);
      }
    }
  }, [workers, workerFilterMode, selectedSingleWorkerId]);

  // Handler for quick date presets
  const handleApplyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const y = selectedYear;
    const m = selectedMonth;
    const daysInMonth = getDaysInJalaliMonth(y, m);

    if (presetKey === 'full_month') {
      const s = `${y}/${String(m).padStart(2, '0')}/01`;
      const e = `${y}/${String(m).padStart(2, '0')}/${String(daysInMonth).padStart(2, '0')}`;
      setStartDate(s);
      setEndDate(e);
      setDocumentDate(e);
      setDocumentNumber(`SANAD-${y}-${String(m).padStart(2, '0')}${String(daysInMonth).padStart(2, '0')}`);
    } else if (presetKey === 'first_half') {
      const s = `${y}/${String(m).padStart(2, '0')}/01`;
      const e = `${y}/${String(m).padStart(2, '0')}/15`;
      setStartDate(s);
      setEndDate(e);
      setDocumentDate(e);
      setDocumentNumber(`SANAD-${y}-${String(m).padStart(2, '0')}15-N1`);
    } else if (presetKey === 'second_half') {
      const s = `${y}/${String(m).padStart(2, '0')}/16`;
      const e = `${y}/${String(m).padStart(2, '0')}/${String(daysInMonth).padStart(2, '0')}`;
      setStartDate(s);
      setEndDate(e);
      setDocumentDate(e);
      setDocumentNumber(`SANAD-${y}-${String(m).padStart(2, '0')}${String(daysInMonth).padStart(2, '0')}-N2`);
    } else if (presetKey === 'sample_range_10_to_20') {
      const s = `${y}/${String(m).padStart(2, '0')}/10`;
      const e = `${y}/${String(m).padStart(2, '0')}/20`;
      setStartDate(s);
      setEndDate(e);
      setDocumentDate(e);
      setDocumentNumber(`SANAD-${y}-${String(m).padStart(2, '0')}20-P10`);
    } else if (presetKey === 'sample_range_16_to_31') {
      const s = `${y}/01/16`;
      const e = `${y}/01/31`;
      setStartDate(s);
      setEndDate(e);
      setDocumentDate(e);
      setDocumentNumber(`SANAD-${y}-0131-SAMPLE`);
    }
  };

  // Helper date dropdown selectors
  const parsedStart = useMemo(() => {
    const norm = normalizeJalaliDate(startDate);
    const parts = norm.split('/').map(Number);
    return {
      year: parts[0] || selectedYear,
      month: parts[1] || selectedMonth,
      day: parts[2] || 1,
    };
  }, [startDate, selectedYear, selectedMonth]);

  const parsedEnd = useMemo(() => {
    const norm = normalizeJalaliDate(endDate);
    const parts = norm.split('/').map(Number);
    return {
      year: parts[0] || selectedYear,
      month: parts[1] || selectedMonth,
      day: parts[2] || 1,
    };
  }, [endDate, selectedYear, selectedMonth]);

  const updateStartDateComponent = (field: 'year' | 'month' | 'day', value: number) => {
    setActivePreset('custom');
    const newY = field === 'year' ? value : parsedStart.year;
    const newM = field === 'month' ? value : parsedStart.month;
    const maxDay = getDaysInJalaliMonth(newY, newM);
    const newD = field === 'day' ? Math.min(value, maxDay) : Math.min(parsedStart.day, maxDay);
    const formatted = `${newY}/${String(newM).padStart(2, '0')}/${String(newD).padStart(2, '0')}`;
    setStartDate(formatted);
  };

  const updateEndDateComponent = (field: 'year' | 'month' | 'day', value: number) => {
    setActivePreset('custom');
    const newY = field === 'year' ? value : parsedEnd.year;
    const newM = field === 'month' ? value : parsedEnd.month;
    const maxDay = getDaysInJalaliMonth(newY, newM);
    const newD = field === 'day' ? Math.min(value, maxDay) : Math.min(parsedEnd.day, maxDay);
    const formatted = `${newY}/${String(newM).padStart(2, '0')}/${String(newD).padStart(2, '0')}`;
    setEndDate(formatted);
  };

  // Filtered workers list based on workerFilterMode and search
  const filteredWorkers = useMemo(() => {
    let result = workers;

    if (workerFilterMode === 'active_only') {
      result = result.filter((w) => w.isActive);
    } else if (workerFilterMode === 'single') {
      result = result.filter((w) => w.id === selectedSingleWorkerId);
    } else if (workerFilterMode === 'custom_multi') {
      result = result.filter((w) => selectedWorkerIds.includes(w.id));
    }

    if (searchWorkerQuery.trim()) {
      const q = searchWorkerQuery.trim().toLowerCase();
      result = result.filter((w) => {
        return (
          w.fullName.toLowerCase().includes(q) ||
          w.code.toLowerCase().includes(q) ||
          (w.nationalId && w.nationalId.includes(q)) ||
          w.role.toLowerCase().includes(q) ||
          (w.cardNumber && w.cardNumber.includes(q))
        );
      });
    }

    return result;
  }, [workers, workerFilterMode, selectedSingleWorkerId, selectedWorkerIds, searchWorkerQuery]);

  // Calculate payroll summary for each filtered worker in the arbitrary date range
  const normalizedStartStr = normalizeJalaliDate(startDate);
  const normalizedEndStr = normalizeJalaliDate(endDate);

  const rangePayrollSummaries: WorkerPayrollSummary[] = useMemo(() => {
    return filteredWorkers.map((worker) => {
      return calculateWorkerPayroll(
        worker,
        workRecords,
        adjustments,
        payments,
        settings,
        {
          startDate: normalizedStartStr,
          endDate: normalizedEndStr,
        }
      );
    });
  }, [filteredWorkers, workRecords, adjustments, payments, settings, normalizedStartStr, normalizedEndStr]);

  // Overall calculations for the date range
  const totalPayableAmount = useMemo(() => {
    return rangePayrollSummaries.reduce((sum, s) => {
      const amount = payableBasis === 'net_salary' ? s.netSalary : s.remainingBalance;
      return sum + amount;
    }, 0);
  }, [rangePayrollSummaries, payableBasis]);

  const totalGrossAmount = rangePayrollSummaries.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalNetAmount = rangePayrollSummaries.reduce((sum, s) => sum + s.netSalary, 0);
  const totalPaidAmount = rangePayrollSummaries.reduce((sum, s) => sum + s.totalPaid, 0);
  const totalWorkedHours = rangePayrollSummaries.reduce((sum, s) => sum + s.totalWorkedHours, 0);
  const totalOvertimeHours = rangePayrollSummaries.reduce((sum, s) => sum + s.totalOvertimeHours, 0);
  const totalAdditions = rangePayrollSummaries.reduce((sum, s) => sum + s.totalAdditions, 0);
  const totalDeductions = rangePayrollSummaries.reduce((sum, s) => sum + s.totalDeductions, 0);

  // Filtered daily attendance records within this range for Tab 3
  const rangeAttendanceRecords = useMemo(() => {
    const workerIdSet = new Set(filteredWorkers.map((w) => w.id));
    return workRecords
      .filter(
        (r) =>
          workerIdSet.has(r.workerId) &&
          isJalaliDateInRange(r.jalaliDate, normalizedStartStr, normalizedEndStr)
      )
      .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));
  }, [workRecords, filteredWorkers, normalizedStartStr, normalizedEndStr]);

  // Filtered adjustments and payments for Tab 4
  const rangeAdjustments = useMemo(() => {
    const workerIdSet = new Set(filteredWorkers.map((w) => w.id));
    return adjustments
      .filter(
        (a) =>
          workerIdSet.has(a.workerId) &&
          isJalaliDateInRange(a.jalaliDate, normalizedStartStr, normalizedEndStr)
      )
      .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));
  }, [adjustments, filteredWorkers, normalizedStartStr, normalizedEndStr]);

  const rangePayments = useMemo(() => {
    const workerIdSet = new Set(filteredWorkers.map((w) => w.id));
    return payments
      .filter(
        (p) =>
          workerIdSet.has(p.workerId) &&
          isJalaliDateInRange(p.jalaliDate, normalizedStartStr, normalizedEndStr)
      )
      .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));
  }, [payments, filteredWorkers, normalizedStartStr, normalizedEndStr]);

  // Handler to export Excel Reference Template
  const handleExportReferenceExcel = () => {
    exportReferencePaymentExcel(
      workers,
      workRecords,
      adjustments,
      payments,
      settings,
      {
        startDate: normalizedStartStr,
        endDate: normalizedEndStr,
        documentNumber,
        documentDate,
        selectedWorkerIds: filteredWorkers.map((w) => w.id),
        payableBasis,
      }
    );
  };

  // Handler to export Comprehensive Payroll Excel
  const handleExportPayrollExcel = () => {
    exportCustomRangePayrollExcel(
      workers,
      workRecords,
      adjustments,
      payments,
      settings,
      {
        startDate: normalizedStartStr,
        endDate: normalizedEndStr,
        documentNumber,
        documentDate,
        selectedWorkerIds: filteredWorkers.map((w) => w.id),
      }
    );
  };

  // Handler to export Attendance Excel
  const handleExportAttendanceExcel = () => {
    exportCustomRangeAttendanceExcel(
      workers,
      workRecords,
      {
        startDate: normalizedStartStr,
        endDate: normalizedEndStr,
        selectedWorkerIds: filteredWorkers.map((w) => w.id),
      }
    );
  };

  // Handler to export Full Package Workbook
  const handleExportFullPackageWorkbook = () => {
    exportFullCustomRangeWorkbookExcel(
      workers,
      workRecords,
      adjustments,
      payments,
      settings,
      {
        startDate: normalizedStartStr,
        endDate: normalizedEndStr,
        documentNumber,
        documentDate,
        selectedWorkerIds: filteredWorkers.map((w) => w.id),
        payableBasis,
      }
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner & Main Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                مرکز گزارش‌گیری و خروجی اکسل (قالب مرجع بانکی و حسابداری)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                محاسبه حقوق بر اساس هر بازه تاریخی دلخواه و تولید خروجی رسمی Excel با ستون‌های استاندارد حسابداری
              </p>
            </div>
          </div>
        </div>

        {/* Primary Export Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Primary Action Button for Reference Excel Template */}
          <button
            id="btn-export-reference-excel"
            onClick={handleExportReferenceExcel}
            className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition cursor-pointer"
            title="دانلود فایل اکسل مطابق ساختار مرجع حسابداری و واریزی بانک"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>خروجی اکسل فرمت مرجع (بانک)</span>
          </button>

          {/* Full Package Multi-Sheet Workbook */}
          <button
            id="btn-export-full-package"
            onClick={handleExportFullPackageWorkbook}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            title="دانلود تمام شیت‌ها شامل واریزی، حقوق، تردد و پاداش در یک فایل"
          >
            <Layers className="w-4 h-4 text-blue-100" />
            <span>پکیج کامل (چند شیت)</span>
          </button>

          {/* Print Button */}
          <button
            id="btn-print-report"
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>چاپ گزارش / PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Selection & Filter Control Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>تنظیم بازه تاریخی و شرایط گزارش</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px] ml-1">انتخاب‌های سریع:</span>

            <button
              onClick={() => handleApplyPreset('sample_range_10_to_20')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activePreset === 'sample_range_10_to_20'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ۱۰ تا ۲۰ مرداد (نمونه تست)
            </button>

            <button
              onClick={() => handleApplyPreset('first_half')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activePreset === 'first_half'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ۱۵ روز اول ماه
            </button>

            <button
              onClick={() => handleApplyPreset('second_half')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activePreset === 'second_half'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ۱۵ روز دوم ماه
            </button>

            <button
              onClick={() => handleApplyPreset('full_month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activePreset === 'full_month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              کل ماه جاری
            </button>

            <button
              onClick={() => handleApplyPreset('sample_range_16_to_31')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activePreset === 'sample_range_16_to_31'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ۱۶ تا ۳۱ فروردین
            </button>
          </div>
        </div>

        {/* Date Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Start Date Picker */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>از تاریخ:</span>
              </label>
              <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {toPersianDigits(startDate)}
              </span>
            </div>

            {/* Dropdown Selectors for Start Date */}
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={parsedStart.day}
                onChange={(e) => updateStartDateComponent('day', Number(e.target.value))}
                aria-label="روز شروع"
                className="bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              >
                {Array.from(
                  { length: getDaysInJalaliMonth(parsedStart.year, parsedStart.month) },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>
                    روز {toPersianDigits(d)}
                  </option>
                ))}
              </select>

              <select
                value={parsedStart.month}
                onChange={(e) => updateStartDateComponent('month', Number(e.target.value))}
                aria-label="ماه شروع"
                className="bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              >
                {JALALI_MONTH_NAMES.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={parsedStart.year}
                onChange={(e) => updateStartDateComponent('year', Number(e.target.value))}
                aria-label="سال شروع"
                className="bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={1402}>۱۴۰۲</option>
                <option value={1403}>۱۴۰۳</option>
                <option value={1404}>۱۴۰۴</option>
                <option value={1405}>۱۴۰۵</option>
                <option value={1406}>۱۴۰۶</option>
              </select>
            </div>

            {/* Direct formatted text input */}
            <input
              type="text"
              value={startDate}
              onChange={(e) => {
                setActivePreset('custom');
                setStartDate(e.target.value);
              }}
              placeholder="1405/05/10"
              className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono text-center"
            />
          </div>

          {/* End Date Picker */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>تا تاریخ:</span>
              </label>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {toPersianDigits(endDate)}
              </span>
            </div>

            {/* Dropdown Selectors for End Date */}
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={parsedEnd.day}
                onChange={(e) => updateEndDateComponent('day', Number(e.target.value))}
                aria-label="روز پایان"
                className="bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              >
                {Array.from(
                  { length: getDaysInJalaliMonth(parsedEnd.year, parsedEnd.month) },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>
                    روز {toPersianDigits(d)}
                  </option>
                ))}
              </select>

              <select
                value={parsedEnd.month}
                onChange={(e) => updateEndDateComponent('month', Number(e.target.value))}
                aria-label="ماه پایان"
                className="bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              >
                {JALALI_MONTH_NAMES.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={parsedEnd.year}
                onChange={(e) => updateEndDateComponent('year', Number(e.target.value))}
                aria-label="سال پایان"
                className="bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={1402}>۱۴۰۲</option>
                <option value={1403}>۱۴۰۳</option>
                <option value={1404}>۱۴۰۴</option>
                <option value={1405}>۱۴۰۵</option>
                <option value={1406}>۱۴۰۶</option>
              </select>
            </div>

            {/* Direct formatted text input */}
            <input
              type="text"
              value={endDate}
              onChange={(e) => {
                setActivePreset('custom');
                setEndDate(e.target.value);
              }}
              placeholder="1405/05/20"
              className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono text-center"
            />
          </div>

          {/* Worker Filter Selection */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>فیلتر پرسنل و کارگران:</span>
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">
                {filteredWorkers.length} کارگر
              </span>
            </label>

            <select
              value={workerFilterMode}
              onChange={(e) => setWorkerFilterMode(e.target.value as WorkerFilterMode)}
              aria-label="فیلتر وضعیت پرسنل"
              className="w-full bg-white text-slate-800 p-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">همه کارگران ({workers.length} نفر)</option>
              <option value="active_only">فقط کارگران فعال ({workers.filter((w) => w.isActive).length} نفر)</option>
              <option value="single">یک کارگر خاص...</option>
              <option value="custom_multi">انتخاب چندگانه سفارشی...</option>
            </select>

            {workerFilterMode === 'single' && (
              <select
                value={selectedSingleWorkerId}
                onChange={(e) => setSelectedSingleWorkerId(e.target.value)}
                aria-label="انتخاب کارگر خاص"
                className="w-full bg-white text-slate-800 p-1.5 rounded-lg border border-blue-400 text-xs focus:outline-none"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.role}) - کد: {w.code}
                  </option>
                ))}
              </select>
            )}

            {workerFilterMode === 'custom_multi' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                  className="w-full bg-white text-slate-800 p-1.5 rounded-lg border border-slate-300 text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>{selectedWorkerIds.length} نفر انتخاب شده</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isMultiSelectOpen && (
                  <div className="absolute z-30 top-full mt-1 right-0 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerIds(workers.map((w) => w.id))}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        انتخاب همه
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerIds([])}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        لغو همه
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {workers.map((w) => {
                        const checked = selectedWorkerIds.includes(w.id);
                        return (
                          <label
                            key={w.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== w.id));
                                } else {
                                  setSelectedWorkerIds([...selectedWorkerIds, w.id]);
                                }
                              }}
                              className="rounded text-blue-600"
                            />
                            <span className="text-slate-800 font-medium">{w.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono mr-auto">{w.code}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document & Accounting Config */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-600" />
                <span>مشخصات سند واریزی:</span>
              </span>
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="شماره سند (مثال: 1405-0520)"
                  title="شماره سند برای درج در اکسل"
                  className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[11px] text-slate-500">مبنای مبلغ:</span>
                <select
                  value={payableBasis}
                  onChange={(e) => setPayableBasis(e.target.value as 'net_balance' | 'net_salary')}
                  aria-label="مبنای محاسبه مبلغ واریزی"
                  className="bg-white text-slate-800 px-2 py-1 rounded-lg border border-slate-300 text-[11px] focus:outline-none"
                >
                  <option value="net_balance">مانده قابل پرداخت (خالص - واریزی)</option>
                  <option value="net_salary">خالص حقوق استحقاقی بازه</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid strictly for this arbitrary date range */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payable Amount - Primary Spotlight */}
        <div className="bg-white border-2 border-emerald-500/80 p-4 rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50/40 via-white to-white">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
            <span>مبلغ کل واریزی (ستون مبلغ اکسل)</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
              {toPersianDigits(filteredWorkers.length)} کارگر
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-emerald-700 font-mono tracking-tight">
            {formatCurrency(totalPayableAmount, settings.currencyUnit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>بازه: {toPersianDigits(startDate)} تا {toPersianDigits(endDate)}</span>
          </div>
        </div>

        {/* Gross Salary in Range */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">حقوق ناخالص کارکرد در بازه</div>
          <div className="text-lg md:text-xl font-bold text-slate-800 font-mono">
            {formatCurrency(totalGrossAmount, settings.currencyUnit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span>پایه + اضافه کاری + پاداش‌ها</span>
          </div>
        </div>

        {/* Total Hours & Overtime in Range */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">مجموع ساعات کارکرد و اضافه کاری</div>
          <div className="text-lg md:text-xl font-bold text-blue-600 font-mono">
            {formatHours(totalWorkedHours)}
          </div>
          <div className="text-[11px] text-blue-700/80 mt-1 font-mono">
            شامل {formatHours(totalOvertimeHours)} اضافه کاری
          </div>
        </div>

        {/* Paid / Adjustments in Range */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">تعدیلات و واریزی‌های بازه</div>
          <div className="text-lg md:text-xl font-bold text-slate-700 font-mono">
            {formatCurrency(totalPaidAmount, settings.currencyUnit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-emerald-700">+{formatCurrency(totalAdditions, settings.currencyUnit, false)}</span>
            <span className="text-rose-600">-{formatCurrency(totalDeductions, settings.currencyUnit, false)}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Table Header */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Navigation Tabs and Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs pb-1 md:pb-0">
            <button
              onClick={() => setActiveReportTab('reference')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'reference'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>پیش‌نمایش فرمت مرجع (واریزی بانکی)</span>
            </button>

            <button
              onClick={() => setActiveReportTab('payroll')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'payroll'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>لیست جامع حقوق و دستمزد</span>
            </button>

            <button
              onClick={() => setActiveReportTab('attendance')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ریز کارکرد و تردد روزانه ({rangeAttendanceRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveReportTab('adjustments')}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'adjustments'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>پاداش، کسورات و پرداختی‌ها ({rangeAdjustments.length + rangePayments.length})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو (نام، کد، کد ملی، سمت)..."
              value={searchWorkerQuery}
              onChange={(e) => setSearchWorkerQuery(e.target.value)}
              className="w-full bg-white text-slate-800 text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-300 hover:border-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tab 1: Reference Payment Format Table (الگوی فایل مرجع نمونه) */}
        {activeReportTab === 'reference' && (
          <div>
            <div className="bg-blue-50/50 px-4 py-2.5 border-b border-blue-100 text-xs text-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>
                  ستون‌های جدول زیر دقیقاً منطبق بر فایل مرجع اکسل نمونه آماده‌سازی شده است:
                  <strong className="mr-1">ردیف | لیست افراد واریزی | عنوان شغلی | کد ملی | شماره سند | مبلغ | شماره کارت | شبا | شماره تماس | صاحب حساب</strong>
                </span>
              </div>
              <button
                onClick={handleExportReferenceExcel}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دریافت فوری اکسل</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-3 text-center w-12">ردیف</th>
                    <th className="py-3.5 px-4">لیست افراد واریزی</th>
                    <th className="py-3.5 px-4">عنوان شغلی</th>
                    <th className="py-3.5 px-3 text-center">کد ملی</th>
                    <th className="py-3.5 px-3 text-center">شماره سند</th>
                    <th className="py-3.5 px-4 text-center font-bold text-emerald-800 bg-emerald-50/60">
                      مبلغ ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'})
                    </th>
                    <th className="py-3.5 px-3 text-center">شماره کارت</th>
                    <th className="py-3.5 px-3 text-center">شبا</th>
                    <th className="py-3.5 px-3 text-center">شماره تماس</th>
                    <th className="py-3.5 px-4">صاحب حساب</th>
                    <th className="py-3.5 px-3 text-center">کارتابل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rangePayrollSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-slate-400">
                        کارگری با شرایط انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    rangePayrollSummaries.map((s, idx) => {
                      const w = s.worker;
                      const payable = payableBasis === 'net_salary' ? s.netSalary : s.remainingBalance;
                      const card = w.cardNumber || w.accountNumber || '-';
                      const shaba = w.shabaNumber || '-';
                      const accountOwner = w.accountOwner || w.fullName;

                      return (
                        <tr
                          key={w.id}
                          className="hover:bg-blue-50/40 transition group"
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[10px]"
                                style={{ backgroundColor: w.avatarColor || '#2563eb' }}
                              >
                                {w.fullName.slice(0, 1)}
                              </span>
                              <span>{w.fullName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{w.role || '-'}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            {w.nationalId ? toPersianDigits(w.nationalId) : '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                            {documentNumber}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40 text-xs">
                            {formatCurrency(payable, settings.currencyUnit)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px]" dir="ltr">
                            {card !== '-' ? toPersianDigits(card) : '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px]" dir="ltr">
                            {shaba !== '-' ? shaba : '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            {w.phone ? toPersianDigits(w.phone) : '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{accountOwner}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => onOpenWorkerPortal(w)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition cursor-pointer"
                              title="مشاهده کارتابل اختصاصی"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {rangePayrollSummaries.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-3.5 px-4">
                        جمع کل ({rangePayrollSummaries.length} نفر)
                      </td>
                      <td colSpan={3} className="py-3.5 px-4 text-slate-500 text-xs">
                        بازه محاسباتی: {toPersianDigits(startDate)} تا {toPersianDigits(endDate)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-800 bg-emerald-100/70 text-sm">
                        {formatCurrency(totalPayableAmount, settings.currencyUnit)}
                      </td>
                      <td colSpan={5} className="py-3.5 px-4 text-slate-400 text-left">
                        آماده صدور در قالب مرجع Excel
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Full Comprehensive Payroll Table */}
        {activeReportTab === 'payroll' && (
          <div>
            <div className="p-3 bg-slate-50 text-xs flex items-center justify-between border-b border-slate-200">
              <span className="text-slate-600">
                گزارش تفکیکی ساعات کارکرد، نرخ پایه، اضافه کاری، پاداش‌ها و مانده طلب در بازه انتخابی
              </span>
              <button
                onClick={handleExportPayrollExcel}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>دانلود اکسل این جدول</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">کارگر</th>
                    <th className="py-3 px-3 text-center">نوع دستمزد</th>
                    <th className="py-3 px-3 text-center">روزهای حضور</th>
                    <th className="py-3 px-3 text-center">ساعت کار</th>
                    <th className="py-3 px-3 text-center">اضافه کاری</th>
                    <th className="py-3 px-4 text-center">حقوق پایه کارکرد</th>
                    <th className="py-3 px-4 text-center text-emerald-700">مبلغ اضافه کاری</th>
                    <th className="py-3 px-4 text-center text-emerald-700">پاداش و مزایا</th>
                    <th className="py-3 px-4 text-center text-rose-600">کسورات و جریمه</th>
                    <th className="py-3 px-4 text-center font-bold text-blue-700">خالص حقوق استحقاقی</th>
                    <th className="py-3 px-4 text-center">پرداخت شده در بازه</th>
                    <th className="py-3 px-4 text-center font-bold text-amber-700">مانده قابل تسویه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rangePayrollSummaries.map((s) => (
                    <tr
                      key={s.worker.id}
                      onClick={() => onOpenWorkerPortal(s.worker)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{s.worker.fullName}</div>
                        <div className="text-[10px] text-slate-400">{s.worker.role} - کد: {s.worker.code}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {s.worker.wageType === 'hourly' ? 'ساعتی' : s.worker.wageType === 'daily' ? 'روزانه' : 'ماهانه'}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 font-mono">
                        {toPersianDigits(s.workedDaysCount)} روز
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700 font-mono">
                        {formatHours(s.totalWorkedHours)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                        {formatHours(s.totalOvertimeHours)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {formatCurrency(s.baseSalary, settings.currencyUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700">
                        +{formatCurrency(s.overtimeSalary, settings.currencyUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700">
                        +{formatCurrency(s.totalAdditions, settings.currencyUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-rose-600">
                        -{formatCurrency(s.totalDeductions, settings.currencyUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                        {formatCurrency(s.netSalary, settings.currencyUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700">
                        {formatCurrency(s.totalPaid, settings.currencyUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                        {formatCurrency(s.remainingBalance, settings.currencyUnit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4">مجموع کل کارگاه</td>
                    <td className="py-3 px-3 text-center font-mono text-blue-700">{formatHours(totalWorkedHours)}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700">{formatHours(totalOvertimeHours)}</td>
                    <td className="py-3 px-4 text-center"></td>
                    <td className="py-3 px-4 text-center"></td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700">+{formatCurrency(totalAdditions, settings.currencyUnit)}</td>
                    <td className="py-3 px-4 text-center font-mono text-rose-600">-{formatCurrency(totalDeductions, settings.currencyUnit)}</td>
                    <td className="py-3 px-4 text-center font-mono text-blue-700">{formatCurrency(totalNetAmount, settings.currencyUnit)}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700">{formatCurrency(totalPaidAmount, settings.currencyUnit)}</td>
                    <td className="py-3 px-4 text-center font-mono text-amber-700">{formatCurrency(totalPayableAmount, settings.currencyUnit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Daily Attendance Logs in Range */}
        {activeReportTab === 'attendance' && (
          <div>
            <div className="p-3 bg-slate-50 text-xs flex items-center justify-between border-b border-slate-200">
              <span className="text-slate-600">
                ریز سوابق حضور، ورود، خروج، کسر استراحت و اضافه کاری کارگران در بازه {toPersianDigits(startDate)} تا {toPersianDigits(endDate)}
              </span>
              <button
                onClick={handleExportAttendanceExcel}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>دانلود اکسل تردد و کارکرد</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-3 text-center">ردیف</th>
                    <th className="py-3 px-3 text-center">تاریخ</th>
                    <th className="py-3 px-3 text-center">روز</th>
                    <th className="py-3 px-4">نام کارگر</th>
                    <th className="py-3 px-3 text-center">ورود</th>
                    <th className="py-3 px-3 text-center">خروج</th>
                    <th className="py-3 px-3 text-center">استراحت</th>
                    <th className="py-3 px-3 text-center">کارکرد</th>
                    <th className="py-3 px-3 text-center">اضافه کاری</th>
                    <th className="py-3 px-3 text-center">وضعیت</th>
                    <th className="py-3 px-4">توضیحات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rangeAttendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        هیچ رکورد کارکردی در این بازه تاریخی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    rangeAttendanceRecords.map((r, idx) => {
                      const w = workers.find((wk) => wk.id === r.workerId);
                      const weekday = getJalaliWeekdayName(r.year, r.month, r.day);
                      return (
                        <tr key={r.id || `${r.workerId}-${r.jalaliDate}`} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800">
                            {toPersianDigits(r.jalaliDate)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{weekday}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{w?.fullName || 'کارگر'}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">{toPersianDigits(r.entryTime || '-')}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">{toPersianDigits(r.exitTime || '-')}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{toPersianDigits(r.breakDurationMinutes || 0)} د</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                            {formatHours(r.workedHours || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                            {formatHours(r.overtimeHours || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'full'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.status === 'half'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : r.status === 'holiday'
                                  ? 'bg-slate-100 text-slate-600'
                                  : r.status === 'leave'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {r.status === 'full'
                                ? 'کامل'
                                : r.status === 'half'
                                ? 'نیمه‌وقت'
                                : r.status === 'holiday'
                                ? 'تعطیل'
                                : r.status === 'leave'
                                ? 'مرخصی'
                                : r.status === 'mission'
                                ? 'ماموریت'
                                : 'غیبت'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{r.notes || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Adjustments & Payments in Range */}
        {activeReportTab === 'adjustments' && (
          <div className="p-4 space-y-6">
            {/* Financial Adjustments Section */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>پاداش‌ها، مزایا، جریمه‌ها و مساعده‌های ثبت‌شده در بازه ({rangeAdjustments.length})</span>
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center">تاریخ</th>
                      <th className="py-2.5 px-4">کارگر</th>
                      <th className="py-2.5 px-4">عنوان تراکنش</th>
                      <th className="py-2.5 px-3 text-center">دسته‌بندی</th>
                      <th className="py-2.5 px-4 text-center">مبلغ</th>
                      <th className="py-2.5 px-4">توضیحات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rangeAdjustments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          هیچ مورد پاداش یا جریمه‌ای در این بازه ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      rangeAdjustments.map((a) => {
                        const w = workers.find((wk) => wk.id === a.workerId);
                        const isAddition = a.category === 'addition';
                        return (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {toPersianDigits(a.jalaliDate)}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">{w?.fullName || 'کارگر'}</td>
                            <td className="py-2.5 px-4 text-slate-800">{a.title}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAddition
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isAddition ? 'پاداش / افزایشی (+)' : 'کسورات / کاهشی (-)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold">
                              <span className={isAddition ? 'text-emerald-700' : 'text-rose-600'}>
                                {isAddition ? '+' : '-'}
                                {formatCurrency(a.amount, settings.currencyUnit)}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">{a.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments Section */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>پرداختی‌ها و واریزی‌های ثبت‌شده در این بازه ({rangePayments.length})</span>
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center">تاریخ واریز</th>
                      <th className="py-2.5 px-4">نام کارگر</th>
                      <th className="py-2.5 px-4 text-center">مبلغ واریزی</th>
                      <th className="py-2.5 px-3 text-center">روش پرداخت</th>
                      <th className="py-2.5 px-3 text-center">شماره پیگیری</th>
                      <th className="py-2.5 px-4">توضیحات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rangePayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          هیچ پرداختی در این بازه زمانی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      rangePayments.map((p) => {
                        const w = workers.find((wk) => wk.id === p.workerId);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {toPersianDigits(p.jalaliDate)}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">{w?.fullName || 'کارگر'}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700">
                              {formatCurrency(p.amount, settings.currencyUnit)}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">{p.method}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {p.trackingNumber || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">{p.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
