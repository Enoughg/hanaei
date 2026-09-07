import React, { useState } from 'react';
import { Worker, WorkRecord, WorkStatus, AppSettings } from '../types';
import {
  calculateWorkedHours,
  toPersianDigits,
  getDaysInJalaliMonth,
  JALALI_MONTH_NAMES,
  getJalaliWeekdayName,
} from '../utils/jalali';
import {
  CalendarCheck2,
  Users,
  Copy,
  Clock,
  Sparkles,
  X,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface BatchWorkModalProps {
  workers: Worker[];
  year: number;
  month: number;
  settings: AppSettings;
  onBatchSave: (records: WorkRecord[]) => void;
  onBatchDelete?: (recordsToDelete: { workerId: string; year: number; month: number; day: number }[]) => void;
  onClose: () => void;
}

export const BatchWorkModal: React.FC<BatchWorkModalProps> = ({
  workers,
  year,
  month,
  settings,
  onBatchSave,
  onBatchDelete,
  onClose,
}) => {
  const daysInMonth = getDaysInJalaliMonth(year, month);
  const activeWorkers = workers.filter((w) => w.isActive);

  const [mode, setMode] = useState<'multiday' | 'group' | 'autofill' | 'clear'>('multiday');

  // Multi-day state (1 worker, range of days)
  const [selectedWorkerId, setSelectedWorkerId] = useState(activeWorkers[0]?.id || '');
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(Math.min(25, daysInMonth));
  const [skipFridays, setSkipFridays] = useState(true);

  // Clear mode state
  const [clearTarget, setClearTarget] = useState<'single' | 'all'>('single');
  const [clearStartDay, setClearStartDay] = useState(1);
  const [clearEndDay, setClearEndDay] = useState(daysInMonth);

  // Group state (multiple workers, 1 day)
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(
    activeWorkers.map((w) => w.id)
  );
  const [targetDay, setTargetDay] = useState(1);

  // Common work settings
  const [entryTime, setEntryTime] = useState(
    settings.workStartHour && settings.workStartHour !== '08:00' ? settings.workStartHour : '07:30'
  );
  const [exitTime, setExitTime] = useState(
    settings.workEndHour && settings.workEndHour !== '17:00' && settings.workEndHour !== '16:00'
      ? settings.workEndHour
      : '16:30'
  );
  const [breakMinutes, setBreakMinutes] = useState(settings.defaultBreakMinutes ?? 60);
  const [status, setStatus] = useState<WorkStatus>('full');
  const [notes, setNotes] = useState('ثبت سریع گروهی');

  const { workedHours, overtimeHours } = calculateWorkedHours(
    entryTime,
    exitTime,
    breakMinutes,
    settings.defaultDailyHours || 8
  );

  const handleToggleWorker = (id: string) => {
    if (selectedWorkerIds.includes(id)) {
      setSelectedWorkerIds(selectedWorkerIds.filter((wId) => wId !== id));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, id]);
    }
  };

  const handleSelectAllWorkers = () => {
    if (selectedWorkerIds.length === activeWorkers.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(activeWorkers.map((w) => w.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'clear') {
      if (!onBatchDelete) return;
      const targetWorkerIds =
        clearTarget === 'all'
          ? activeWorkers.map((w) => w.id)
          : selectedWorkerId
          ? [selectedWorkerId]
          : [];

      const itemsToDelete: { workerId: string; year: number; month: number; day: number }[] = [];
      targetWorkerIds.forEach((wId) => {
        for (let d = clearStartDay; d <= clearEndDay; d++) {
          itemsToDelete.push({
            workerId: wId,
            year,
            month,
            day: d,
          });
        }
      });

      onBatchDelete(itemsToDelete);
      onClose();
      return;
    }

    const newRecords: WorkRecord[] = [];

    if (mode === 'multiday') {
      // Create records for selectedWorkerId from startDay to endDay
      for (let d = startDay; d <= endDay; d++) {
        const weekday = getJalaliWeekdayName(year, month, d);
        const isFriday = weekday === 'جمعه';

        if (isFriday && skipFridays) {
          newRecords.push({
            id: `rec-${selectedWorkerId}-${d}`,
            workerId: selectedWorkerId,
            jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
            year,
            month,
            day: d,
            entryTime: '',
            exitTime: '',
            breakDurationMinutes: 0,
            workedHours: 0,
            overtimeHours: 0,
            status: 'holiday',
            notes: 'تعطیل جمعه',
            updatedAt: new Date().toISOString(),
          });
        } else {
          newRecords.push({
            id: `rec-${selectedWorkerId}-${d}`,
            workerId: selectedWorkerId,
            jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
            year,
            month,
            day: d,
            entryTime: status === 'holiday' ? '' : entryTime,
            exitTime: status === 'holiday' ? '' : exitTime,
            breakDurationMinutes: status === 'holiday' ? 0 : breakMinutes,
            workedHours: status === 'holiday' ? 0 : workedHours,
            overtimeHours: status === 'holiday' ? 0 : overtimeHours,
            status,
            notes,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } else if (mode === 'group') {
      // Create records for all selectedWorkerIds for targetDay
      selectedWorkerIds.forEach((wId) => {
        newRecords.push({
          id: `rec-${wId}-${targetDay}`,
          workerId: wId,
          jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(targetDay).padStart(2, '0')}`,
          year,
          month,
          day: targetDay,
          entryTime: status === 'holiday' ? '' : entryTime,
          exitTime: status === 'holiday' ? '' : exitTime,
          breakDurationMinutes: status === 'holiday' ? 0 : breakMinutes,
          workedHours: status === 'holiday' ? 0 : workedHours,
          overtimeHours: status === 'holiday' ? 0 : overtimeHours,
          status,
          notes,
          updatedAt: new Date().toISOString(),
        });
      });
    } else if (mode === 'autofill') {
      // Auto-fill standard work month for all active workers!
      activeWorkers.forEach((w) => {
        for (let d = 1; d <= daysInMonth; d++) {
          const weekday = getJalaliWeekdayName(year, month, d);
          const isFriday = weekday === 'جمعه';

          if (isFriday) {
            newRecords.push({
              id: `rec-${w.id}-${d}`,
              workerId: w.id,
              jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
              year,
              month,
              day: d,
              entryTime: '',
              exitTime: '',
              breakDurationMinutes: 0,
              workedHours: 0,
              overtimeHours: 0,
              status: 'holiday',
              notes: 'تعطیل هفتگی',
              updatedAt: new Date().toISOString(),
            });
          } else {
            newRecords.push({
              id: `rec-${w.id}-${d}`,
              workerId: w.id,
              jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
              year,
              month,
              day: d,
              entryTime: settings.workStartHour || '07:30',
              exitTime: settings.workEndHour || '16:30',
              breakDurationMinutes: settings.defaultBreakMinutes ?? 60,
              workedHours: settings.defaultDailyHours || 8,
              overtimeHours: 0,
              status: 'full',
              notes: 'ثبت استاندارد ماهانه',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });
    }

    onBatchSave(newRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                ابزار ثبت سریع و گروهی کارکرد ({JALALI_MONTH_NAMES[month - 1]} {toPersianDigits(year)})
              </h3>
              <p className="text-xs text-slate-500">
                افزایش چشمگیر سرعت ثبت ساعات ورود و خروج کارگران
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-100/60 p-2.5 border-b border-slate-200 grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setMode('multiday')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'multiday'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>چندروزه</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('group')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'group'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>گروهی</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('autofill')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'autofill'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>کل ماه</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('clear')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'clear'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>حذف و پاک‌سازی</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* MODE 1: MULTI-DAY */}
          {mode === 'multiday' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  انتخاب کارگر
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500"
                >
                  {activeWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} (کد: {w.code} - {w.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    از روز (شماره روز در ماه)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={startDay}
                    onChange={(e) => setStartDay(Number(e.target.value))}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تا روز (شماره روز در ماه)
                  </label>
                  <input
                    type="number"
                    min={startDay}
                    max={daysInMonth}
                    value={endDay}
                    onChange={(e) => setEndDay(Number(e.target.value))}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="skipFridaysCheck"
                  checked={skipFridays}
                  onChange={(e) => setSkipFridays(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded bg-white border-slate-300"
                />
                <label htmlFor="skipFridaysCheck" className="text-xs text-slate-700 cursor-pointer font-medium">
                  روزهای جمعه به صورت خودکار «تعطیل» ثبت شوند (ساعت صفر)
                </label>
              </div>
            </div>
          )}

          {/* MODE 2: GROUP ENTRY */}
          {mode === 'group' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  روز مورد نظر (۱ تا {toPersianDigits(daysInMonth)})
                </label>
                <input
                  type="number"
                  min={1}
                  max={daysInMonth}
                  value={targetDay}
                  onChange={(e) => setTargetDay(Number(e.target.value))}
                  className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    انتخاب کارگران ({toPersianDigits(selectedWorkerIds.length)} نفر انتخاب‌شده)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllWorkers}
                    className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                  >
                    {selectedWorkerIds.length === activeWorkers.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {activeWorkers.map((w) => {
                    const isSelected = selectedWorkerIds.includes(w.id);
                    return (
                      <div
                        key={w.id}
                        onClick={() => handleToggleWorker(w.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">{w.fullName}</span>
                        <span className="font-mono text-[11px] text-slate-400">#{w.code}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: AUTO-FILL ENTIRE MONTH */}
          {mode === 'autofill' && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>پرکردن خودکار کارکرد تمام روزهای ماه برای کلیه کارگران فعال</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                با اعمال این گزینه، برای تمام کارگران فعال در روزهای شنبه تا پنج‌شنبه کارکرد استاندارد (ساعت ۰۸:۰۰ تا ۱۷:۰۰ با ۱ ساعت ناهار = ۸ ساعت کار) و برای تمام جمعه‌ها وضعیت تعطیل ثبت می‌گردد. پس از آن می‌توانید روزهای خاص را ویرایش کنید.
              </p>
            </div>
          )}

          {/* MODE 4: CLEAR / DELETE RECORDS */}
          {mode === 'clear' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>راهنمای حذف و پاک‌سازی کارکردها</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">
                  با استفاده از این فرم می‌توانید کارکردهای ثبت‌شده (ساعات حضور/غیبت و رکوردهای مالی متصل به آن) را از جدول حذف کرده و به حالت بدون رکورد اولیه بازگردانید.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  محدوده حذف کارگران
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label
                    onClick={() => setClearTarget('single')}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      clearTarget === 'single'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clearTarget"
                      checked={clearTarget === 'single'}
                      onChange={() => setClearTarget('single')}
                      className="text-rose-600"
                    />
                    <span>یک کارگر مشخص</span>
                  </label>

                  <label
                    onClick={() => setClearTarget('all')}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      clearTarget === 'all'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clearTarget"
                      checked={clearTarget === 'all'}
                      onChange={() => setClearTarget('all')}
                      className="text-rose-600"
                    />
                    <span>تمام کارگران در این ماه</span>
                  </label>
                </div>

                {clearTarget === 'single' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      انتخاب کارگر
                    </label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-rose-500"
                    >
                      {activeWorkers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.fullName} (کد: {w.code} - {w.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    از روز
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={clearStartDay}
                    onChange={(e) => setClearStartDay(Number(e.target.value))}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تا روز
                  </label>
                  <input
                    type="number"
                    min={clearStartDay}
                    max={daysInMonth}
                    value={clearEndDay}
                    onChange={(e) => setClearEndDay(Number(e.target.value))}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Working Hours settings for Mode 1 & 2 */}
          {mode !== 'autofill' && mode !== 'clear' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>ساعات و وضعیت کارکرد اعمال‌شونده</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-medium">ساعت ورود</label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-medium">ساعت خروج</label>
                  <input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-medium">استراحت (دقیقه)</label>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                <span>
                  ساعات کارکرد محاسبه‌شده:{' '}
                  <strong className="text-indigo-700 font-mono">{toPersianDigits(workedHours)} ساعت</strong>
                </span>
                <span>
                  اضافه کاری:{' '}
                  <strong className="text-emerald-700 font-mono">{toPersianDigits(overtimeHours)} ساعت</strong>
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              انصراف
            </button>
            {mode === 'clear' ? (
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأیید و پاک‌سازی کارکردها</span>
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
              >
                اعمال و ثبت دسته‌جمعی
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
