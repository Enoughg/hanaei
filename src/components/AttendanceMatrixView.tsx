import React, { useState, useMemo } from 'react';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  AppSettings,
} from '../types';
import {
  getDaysInJalaliMonth,
  JALALI_MONTH_NAMES,
  getJalaliWeekdayName,
  getJalaliWeekdayIndex,
  toPersianDigits,
  formatHours,
  formatCurrency,
  getAvailableJalaliYears,
} from '../utils/jalali';
import { exportMonthlyWorkRecordsExcel } from '../services/excelExport';
import {
  CalendarCheck2,
  Sparkles,
  Users,
  Clock,
  Gift,
  FileSpreadsheet,
  Plus,
  HelpCircle,
  FolderKanban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { DailyWorkModal } from './DailyWorkModal';
import { BatchWorkModal } from './BatchWorkModal';

interface AttendanceMatrixViewProps {
  workers: Worker[];
  workRecords: WorkRecord[];
  adjustments: FinancialAdjustment[];
  payments: Payment[];
  settings: AppSettings;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  onSaveDailyWork: (record: WorkRecord, dayAdjustments: FinancialAdjustment[]) => void;
  onDeleteDailyWork?: (workerId: string, year: number, month: number, day: number) => void;
  onBatchSaveRecords: (records: WorkRecord[]) => void;
  onBatchDeleteRecords?: (recordsToDelete: { workerId: string; year: number; month: number; day: number }[]) => void;
  onOpenWorkerPortal: (worker: Worker) => void;
}

export const AttendanceMatrixView: React.FC<AttendanceMatrixViewProps> = ({
  workers,
  workRecords,
  adjustments,
  payments,
  settings,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  onSaveDailyWork,
  onDeleteDailyWork,
  onBatchSaveRecords,
  onBatchDeleteRecords,
  onOpenWorkerPortal,
}) => {
  const daysCount = getDaysInJalaliMonth(selectedYear, selectedMonth);
  const monthName = JALALI_MONTH_NAMES[selectedMonth - 1];

  const [activeOnly, setActiveOnly] = useState(true);
  const [searchWorker, setSearchWorker] = useState('');

  // Daily modal state
  const [selectedCell, setSelectedCell] = useState<{
    worker: Worker;
    day: number;
  } | null>(null);

  // Batch modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Filter workers
  const visibleWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (activeOnly && !w.isActive) return false;
      if (searchWorker.trim()) {
        const q = searchWorker.trim().toLowerCase();
        return (
          w.fullName.toLowerCase().includes(q) ||
          w.code.includes(q) ||
          w.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [workers, activeOnly, searchWorker]);

  // Fast map for (workerId + day) -> WorkRecord
  const recordMap = useMemo(() => {
    const map = new Map<string, WorkRecord>();
    workRecords.forEach((rec) => {
      if (rec.year === selectedYear && rec.month === selectedMonth) {
        map.set(`${rec.workerId}-${rec.day}`, rec);
      }
    });
    return map;
  }, [workRecords, selectedYear, selectedMonth]);

  // Fast map for (workerId + day) -> FinancialAdjustment[]
  const adjustmentMap = useMemo(() => {
    const map = new Map<string, FinancialAdjustment[]>();
    adjustments.forEach((adj) => {
      if (adj.year === selectedYear && adj.month === selectedMonth) {
        const key = `${adj.workerId}-${adj.day}`;
        const existing = map.get(key) || [];
        existing.push(adj);
        map.set(key, existing);
      }
    });
    return map;
  }, [adjustments, selectedYear, selectedMonth]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Month stats
  const totalHoursInMonth = useMemo(() => {
    return workRecords
      .filter((r) => r.year === selectedYear && r.month === selectedMonth)
      .reduce((sum, r) => sum + (r.workedHours || 0), 0);
  }, [workRecords, selectedYear, selectedMonth]);

  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <CalendarCheck2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-bold text-slate-800">
              جدول جامع ثبت کارکرد ماهانه ({monthName} {toPersianDigits(selectedYear)})
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            برای ثبت ساعت ورود/خروج یا پاداش و جریمه، روی سلول روز مورد نظر کلیک کنید.
          </p>
        </div>

        {/* Month Switcher & Batch Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Direct Month and Year Selectors */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handleNextMonth}
              title="ماه بعد"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Month Select */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label="انتخاب ماه جدول"
              className="bg-white text-slate-800 text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
            >
              {JALALI_MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            {/* Year Select (up to 1450) */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="انتخاب سال جدول"
              className="bg-white text-slate-800 text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none cursor-pointer font-mono"
            >
              {getAvailableJalaliYears(1400, 1450).map((yr) => (
                <option key={yr} value={yr}>
                  {toPersianDigits(yr)}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrevMonth}
              title="ماه قبل"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Batch Button */}
          <button
            id="btn-open-batch-modal"
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>ثبت سریع و گروهی</span>
          </button>

          {/* Excel Export for this month */}
          <button
            onClick={() =>
              exportMonthlyWorkRecordsExcel(workers, workRecords, selectedYear, selectedMonth)
            }
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3.5 py-2.5 rounded-lg transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی اکسل این ماه</span>
          </button>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm text-xs">
        {/* Worker Search & Toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="جستجوی کارگر در جدول..."
            value={searchWorker}
            onChange={(e) => setSearchWorker(e.target.value)}
            className="bg-white text-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 w-48 placeholder:text-slate-400"
          />

          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded bg-white border-slate-300 focus:ring-blue-500"
            />
            <span>فقط کارگران فعال</span>
          </label>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">راهنما:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            حضور کامل
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            نیمه‌وقت
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            غیبت
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            مرخصی
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            تعطیل
          </span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
            +پاداش / -جریمه
          </span>
        </div>
      </div>

      {/* Main 30-Day Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[72vh] relative">
          <table className="w-full text-right text-xs border-collapse">
            {/* Sticky Header */}
            <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 shadow-xs border-b border-slate-200">
              <tr>
                {/* Fixed Right Worker Header Column */}
                <th className="py-3 px-3 sticky right-0 bg-slate-50 z-30 min-w-[200px] border-b border-l border-slate-200 shadow-xs">
                  <div className="font-bold text-slate-800">مشخصات کارگر</div>
                </th>

                {/* Monthly Total Hours Column */}
                <th className="py-3 px-2 text-center bg-slate-50 min-w-[70px] border-b border-l border-slate-200">
                  <div className="font-bold text-indigo-700">مجموع کارکرد</div>
                </th>

                {/* Day Columns (1 to 29/30/31) */}
                {daysArray.map((day) => {
                  const weekdayName = getJalaliWeekdayName(selectedYear, selectedMonth, day);
                  const isFriday = weekdayName === 'جمعه';
                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center min-w-[46px] border-b border-l border-slate-200 font-normal ${
                        isFriday
                          ? 'bg-rose-50 text-rose-700 font-bold border-rose-200'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400">{weekdayName.slice(0, 2)}</div>
                      <div className={`font-mono text-xs font-bold ${isFriday ? 'text-rose-700' : 'text-slate-800'}`}>
                        {toPersianDigits(day)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body: Rows = Workers */}
            <tbody className="divide-y divide-slate-100">
              {visibleWorkers.length === 0 ? (
                <tr>
                  <td colSpan={daysCount + 2} className="py-12 text-center text-slate-400">
                    هیچ کارگری برای نمایش در این جدول یافت نشد.
                  </td>
                </tr>
              ) : (
                visibleWorkers.map((worker) => {
                  // Calculate total hours for this worker in this month
                  let workerMonthHours = 0;
                  daysArray.forEach((d) => {
                    const r = recordMap.get(`${worker.id}-${d}`);
                    if (r) workerMonthHours += r.workedHours || 0;
                  });

                  return (
                    <tr key={worker.id} className="hover:bg-blue-50/40 transition">
                      {/* Fixed Right Worker Info Cell */}
                      <td className="py-2 px-3 sticky right-0 bg-white z-10 border-l border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px] shadow-xs shrink-0"
                              style={{ backgroundColor: worker.avatarColor || '#2563eb' }}
                            >
                              {worker.fullName.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-xs truncate">
                                {worker.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                #{worker.code} | {worker.role}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => onOpenWorkerPortal(worker)}
                            title="مشاهده کارتابل اختصاصی"
                            className="text-slate-400 hover:text-blue-600 p-1 hover:bg-slate-100 rounded transition cursor-pointer shrink-0"
                          >
                            <FolderKanban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Total Monthly Hours Badge */}
                      <td className="py-2 px-1 text-center border-l border-slate-200 bg-slate-50">
                        <div className="font-bold font-mono text-indigo-700 text-xs">
                          {formatHours(workerMonthHours)}
                        </div>
                      </td>

                      {/* Days Matrix Cells */}
                      {daysArray.map((day) => {
                        const recKey = `${worker.id}-${day}`;
                        const record = recordMap.get(recKey);
                        const dayAdjs = adjustmentMap.get(recKey) || [];

                        const weekdayName = getJalaliWeekdayName(selectedYear, selectedMonth, day);
                        const isFriday = weekdayName === 'جمعه';

                        // Check financial adjustments badge
                        let hasAddition = false;
                        let hasDeduction = false;
                        let totalAdjAmount = 0;
                        dayAdjs.forEach((a) => {
                          if (a.category === 'addition') hasAddition = true;
                          if (a.category === 'deduction') hasDeduction = true;
                          totalAdjAmount += a.category === 'addition' ? a.amount : -a.amount;
                        });

                        return (
                          <td
                            key={day}
                            onClick={() => setSelectedCell({ worker, day })}
                            className={`p-1 text-center border-l border-slate-200 cursor-pointer transition relative group select-none ${
                              isFriday ? 'bg-rose-50/50' : 'hover:bg-blue-50'
                            }`}
                            title={`کارگر: ${worker.fullName} | روز: ${toPersianDigits(day)} ${monthName}`}
                          >
                            <div className="h-10 flex flex-col items-center justify-center rounded-lg hover:ring-2 hover:ring-blue-500/40 transition">
                              {/* Status & Hours Badge */}
                              {!record ? (
                                <span className="text-slate-300 text-xs">-</span>
                              ) : record.status === 'full' ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-[11px] font-bold font-mono text-emerald-700">
                                    {toPersianDigits(record.workedHours)}h
                                  </span>
                                  {record.overtimeHours > 0 && (
                                    <span className="text-[9px] text-indigo-600 font-mono font-medium">
                                      +{toPersianDigits(record.overtimeHours)}
                                    </span>
                                  )}
                                </div>
                              ) : record.status === 'half' ? (
                                <div className="text-amber-700 text-[10px] font-bold">
                                  {toPersianDigits(record.workedHours)}h
                                </div>
                              ) : record.status === 'holiday' ? (
                                <span className="text-[10px] text-slate-400 font-medium">تعطیل</span>
                              ) : record.status === 'leave' ? (
                                <span className="text-[10px] text-blue-600 font-medium">مرخصی</span>
                              ) : record.status === 'absent' ? (
                                <span className="text-[10px] text-rose-600 font-bold">غیبت</span>
                              ) : record.status === 'mission' ? (
                                <span className="text-[10px] text-purple-600 font-medium">ماموریت</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">سایر</span>
                              )}

                              {/* Financial Adjustment Indicator Tag (نشانگر پاداش/جریمه در سلول) */}
                              {dayAdjs.length > 0 && (
                                <div
                                  className={`text-[8px] px-1 rounded-full font-bold mt-0.5 leading-tight ${
                                    totalAdjAmount >= 0
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {totalAdjAmount >= 0 ? '+' : ''}
                                  {formatCurrency(totalAdjAmount, settings.currencyUnit, false)}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Work Logging Modal */}
      {selectedCell && (
        <DailyWorkModal
          worker={selectedCell.worker}
          dayNumber={selectedCell.day}
          year={selectedYear}
          month={selectedMonth}
          existingRecord={recordMap.get(`${selectedCell.worker.id}-${selectedCell.day}`)}
          existingAdjustments={adjustmentMap.get(`${selectedCell.worker.id}-${selectedCell.day}`) || []}
          settings={settings}
          onSave={(record, adjustments) => {
            onSaveDailyWork(record, adjustments);
            setSelectedCell(null);
          }}
          onDelete={(workerId, year, month, day) => {
            onDeleteDailyWork?.(workerId, year, month, day);
            setSelectedCell(null);
          }}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Batch Work Logging Modal */}
      {isBatchModalOpen && (
        <BatchWorkModal
          workers={workers}
          year={selectedYear}
          month={selectedMonth}
          settings={settings}
          onBatchSave={(records) => {
            onBatchSaveRecords(records);
            setIsBatchModalOpen(false);
          }}
          onBatchDelete={(recordsToDelete) => {
            onBatchDeleteRecords?.(recordsToDelete);
            setIsBatchModalOpen(false);
          }}
          onClose={() => setIsBatchModalOpen(false)}
        />
      )}
    </div>
  );
};
