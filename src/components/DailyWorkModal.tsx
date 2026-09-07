import React, { useState, useEffect } from 'react';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  WorkStatus,
  FinancialAdjustmentType,
  AdjustmentCategory,
  AdjustmentPreset,
  AppSettings,
} from '../types';
import {
  calculateWorkedHours,
  toPersianDigits,
  formatCurrency,
  getJalaliWeekdayName,
} from '../utils/jalali';
import { calculateDailyWageBreakdown } from '../utils/payroll';
import { loadAdjustmentPresets, saveAdjustmentPresets } from '../services/storage';
import { ManagePresetsModal } from './ManagePresetsModal';
import {
  Clock,
  Calendar,
  Gift,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  FileText,
  DollarSign,
  Bookmark,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DailyWorkModalProps {
  worker: Worker;
  dayNumber: number;
  year: number;
  month: number;
  existingRecord?: WorkRecord;
  existingAdjustments?: FinancialAdjustment[];
  settings: AppSettings;
  onSave: (record: WorkRecord, adjustments: FinancialAdjustment[]) => void;
  onDelete?: (workerId: string, year: number, month: number, day: number) => void;
  onClose: () => void;
}

export const DailyWorkModal: React.FC<DailyWorkModalProps> = ({
  worker,
  dayNumber,
  year,
  month,
  existingRecord,
  existingAdjustments = [],
  settings,
  onSave,
  onDelete,
  onClose,
}) => {
  const dateStr = `${year}/${String(month).padStart(2, '0')}/${String(dayNumber).padStart(2, '0')}`;
  const weekdayName = getJalaliWeekdayName(year, month, dayNumber);

  // Form state - Default: 07:30 (07:30 AM) and 16:30 (04:30 PM)
  const [entryTime, setEntryTime] = useState(() => {
    if (existingRecord?.entryTime && existingRecord.entryTime !== '08:00') {
      return existingRecord.entryTime;
    }
    return (settings.workStartHour && settings.workStartHour !== '08:00') ? settings.workStartHour : '07:30';
  });
  const [exitTime, setExitTime] = useState(() => {
    if (existingRecord?.exitTime && existingRecord.exitTime !== '17:00' && existingRecord.exitTime !== '16:00') {
      return existingRecord.exitTime;
    }
    return (settings.workEndHour && settings.workEndHour !== '17:00' && settings.workEndHour !== '16:00') ? settings.workEndHour : '16:30';
  });
  const [breakMinutes, setBreakMinutes] = useState(
    existingRecord ? existingRecord.breakDurationMinutes : (settings.defaultBreakMinutes ?? 60)
  );
  const [status, setStatus] = useState<WorkStatus>(existingRecord?.status || 'full');
  const [notes, setNotes] = useState(existingRecord?.notes || '');
  const [manualOvertime, setManualOvertime] = useState<number | null>(
    existingRecord?.overtimeHours !== undefined ? existingRecord.overtimeHours : null
  );

  // Live calculation of hours
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [calculatedOvertime, setCalculatedOvertime] = useState(0);

  // Financial adjustments attached to this day
  const [dayAdjustments, setDayAdjustments] = useState<FinancialAdjustment[]>([
    ...existingAdjustments,
  ]);

  // Confirm delete state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Presets state & management
  const [presets, setPresets] = useState<AdjustmentPreset[]>(() => loadAdjustmentPresets());
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);

  // New adjustment entry inputs
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);
  const [newAdjTitle, setNewAdjTitle] = useState('پاداش کیفیت کار');
  const [newAdjCustomTitle, setNewAdjCustomTitle] = useState('');
  const [newAdjType, setNewAdjType] = useState<FinancialAdjustmentType>('bonus');
  const [newAdjCategory, setNewAdjCategory] = useState<AdjustmentCategory>('addition');
  const [newAdjAmount, setNewAdjAmount] = useState<number | ''>(200000);
  const [newAdjNotes, setNewAdjNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activePresetSelectedId, setActivePresetSelectedId] = useState<string | null>(null);

  // Auto calculate hours whenever times change
  useEffect(() => {
    if (status === 'absent' || status === 'leave' || status === 'holiday') {
      setCalculatedHours(0);
      setCalculatedOvertime(0);
      return;
    }

    if (entryTime && exitTime) {
      const { workedHours, overtimeHours } = calculateWorkedHours(
        entryTime,
        exitTime,
        breakMinutes,
        settings.defaultDailyHours || 8
      );
      setCalculatedHours(workedHours);
      setCalculatedOvertime(manualOvertime !== null ? manualOvertime : overtimeHours);
    } else {
      setCalculatedHours(0);
      setCalculatedOvertime(0);
    }
  }, [entryTime, exitTime, breakMinutes, status, settings.defaultDailyHours, manualOvertime]);

  // Preset status click helper
  const handleStatusChange = (newStatus: WorkStatus) => {
    setStatus(newStatus);
    if (newStatus === 'holiday' || newStatus === 'absent' || newStatus === 'leave') {
      setEntryTime('');
      setExitTime('');
      setBreakMinutes(0);
    } else if (newStatus === 'full') {
      setEntryTime(settings.workStartHour || '07:30');
      setExitTime(settings.workEndHour || '16:30');
      setBreakMinutes(settings.defaultBreakMinutes ?? 60);
    } else if (newStatus === 'half') {
      setEntryTime(settings.workStartHour || '07:30');
      setExitTime('11:30');
      setBreakMinutes(0);
    }
  };

  // Quick preset selection helper
  const handleSelectPreset = (preset: AdjustmentPreset) => {
    setActivePresetSelectedId(preset.id);
    setNewAdjTitle('custom');
    setNewAdjCustomTitle(preset.title);
    setNewAdjCategory(preset.category);
    setNewAdjType(preset.type || (preset.category === 'addition' ? 'bonus' : 'deduction'));
    setNewAdjAmount(preset.defaultAmount);
    setNewAdjNotes(preset.notes || '');
    setErrorMsg('');
  };

  // Quick direct-add from preset with default amount
  const handleQuickAddPresetDirect = (preset: AdjustmentPreset) => {
    const item: FinancialAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      workerId: worker.id,
      workRecordId: existingRecord?.id || `rec-${worker.id}-${dayNumber}`,
      jalaliDate: dateStr,
      year,
      month,
      day: dayNumber,
      title: preset.title,
      type: preset.type || (preset.category === 'addition' ? 'bonus' : 'deduction'),
      category: preset.category,
      amount: preset.defaultAmount,
      notes: preset.notes || '',
      createdAt: new Date().toISOString(),
    };

    setDayAdjustments((prev) => [...prev, item]);
    setErrorMsg('');
  };

  const handleUpdatePresets = (updatedPresets: AdjustmentPreset[]) => {
    setPresets(updatedPresets);
    saveAdjustmentPresets(updatedPresets);
  };

  // Add or update financial item in list
  const handleAddAdjustment = () => {
    if (!newAdjAmount || Number(newAdjAmount) <= 0) {
      setErrorMsg('لطفاً مبلغ مورد مالی را وارد کنید.');
      return;
    }
    const finalTitle =
      newAdjTitle === 'custom'
        ? newAdjCustomTitle.trim() || 'مورد مالی'
        : newAdjTitle;

    if (editingAdjustmentId) {
      // Update existing adjustment
      setDayAdjustments(
        dayAdjustments.map((a) => {
          if (a.id === editingAdjustmentId) {
            return {
              ...a,
              title: finalTitle,
              type: newAdjType,
              category: newAdjCategory,
              amount: Number(newAdjAmount),
              notes: newAdjNotes.trim(),
            };
          }
          return a;
        })
      );
      setEditingAdjustmentId(null);
    } else {
      // Create new adjustment
      const item: FinancialAdjustment = {
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        workerId: worker.id,
        workRecordId: existingRecord?.id || `rec-${worker.id}-${dayNumber}`,
        jalaliDate: dateStr,
        year,
        month,
        day: dayNumber,
        title: finalTitle,
        type: newAdjType,
        category: newAdjCategory,
        amount: Number(newAdjAmount),
        notes: newAdjNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      setDayAdjustments([...dayAdjustments, item]);
    }

    setNewAdjAmount('');
    setNewAdjNotes('');
    setNewAdjCustomTitle('');
    setActivePresetSelectedId(null);
    setErrorMsg('');
  };

  const handleStartEditAdjustment = (adj: FinancialAdjustment) => {
    setEditingAdjustmentId(adj.id);
    const standardTitles = [
      'پاداش کیفیت کار',
      'پاداش حضور و نظم',
      'پاداش عملکرد',
      'کمک هزینه ایاب و ذهاب',
      'ناهار',
      'جریمه تأخیر',
      'جریمه غیبت',
      'مساعده روزانه',
    ];
    if (standardTitles.includes(adj.title)) {
      setNewAdjTitle(adj.title);
      setNewAdjCustomTitle('');
    } else {
      setNewAdjTitle('custom');
      setNewAdjCustomTitle(adj.title);
    }
    setNewAdjCategory(adj.category);
    setNewAdjType(adj.type || (adj.category === 'addition' ? 'bonus' : 'deduction'));
    setNewAdjAmount(adj.amount);
    setNewAdjNotes(adj.notes || '');
    setActivePresetSelectedId(null);
    setErrorMsg('');
  };

  const handleCancelEditAdjustment = () => {
    setEditingAdjustmentId(null);
    setNewAdjTitle('پاداش کیفیت کار');
    setNewAdjCustomTitle('');
    setNewAdjAmount(200000);
    setNewAdjNotes('');
    setActivePresetSelectedId(null);
    setErrorMsg('');
  };

  const handleRemoveAdjustment = (id: string) => {
    setDayAdjustments(dayAdjustments.filter((a) => a.id !== id));
    if (editingAdjustmentId === id) {
      handleCancelEditAdjustment();
    }
  };

  // Submit complete record and adjustments atomically
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: exit must be after entry if filled
    if (entryTime && exitTime) {
      const [eH, eM] = entryTime.split(':').map(Number);
      const [xH, xM] = exitTime.split(':').map(Number);
      if (xH * 60 + xM < eH * 60 + eM) {
        setErrorMsg('ساعت خروج نمی‌تواند قبل از ساعت ورود باشد.');
        return;
      }
    }

    const record: WorkRecord = {
      id: existingRecord?.id || `rec-${worker.id}-${dayNumber}`,
      workerId: worker.id,
      jalaliDate: dateStr,
      year,
      month,
      day: dayNumber,
      entryTime: entryTime || '',
      exitTime: exitTime || '',
      breakDurationMinutes: Number(breakMinutes) || 0,
      workedHours: calculatedHours,
      overtimeHours: calculatedOvertime,
      status,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSave(record, dayAdjustments);
  };

  const activePresets = presets.filter((p) => p.isActive);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs"
                style={{ backgroundColor: worker.avatarColor || '#2563eb' }}
              >
                {worker.fullName.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">{worker.fullName}</h3>
                  <span className="text-xs bg-slate-200/70 text-slate-700 font-mono px-2 py-0.5 rounded-md border border-slate-300">
                    کد: {worker.code}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    ثبت کارکرد روز: {weekdayName} {toPersianDigits(dayNumber)}/{toPersianDigits(month)}/{toPersianDigits(year)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Work Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ۱. وضعیت کارکرد این روز
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'full' as WorkStatus, label: 'کارکرد کامل', color: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
                  { id: 'half' as WorkStatus, label: 'نیمه‌وقت', color: 'border-amber-300 text-amber-700 bg-amber-50' },
                  { id: 'absent' as WorkStatus, label: 'غیبت', color: 'border-rose-300 text-rose-700 bg-rose-50' },
                  { id: 'leave' as WorkStatus, label: 'مرخصی', color: 'border-blue-300 text-blue-700 bg-blue-50' },
                  { id: 'holiday' as WorkStatus, label: 'تعطیل', color: 'border-slate-300 text-slate-700 bg-slate-100' },
                  { id: 'mission' as WorkStatus, label: 'مأموریت', color: 'border-purple-300 text-purple-700 bg-purple-50' },
                  { id: 'other' as WorkStatus, label: 'سایر', color: 'border-slate-300 text-slate-700 bg-slate-50' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleStatusChange(item.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                      status === item.id
                        ? `${item.color} ring-2 ring-blue-600 font-bold shadow-xs`
                        : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Attendance Hours Inputs */}
            {status !== 'holiday' && status !== 'absent' && status !== 'leave' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="font-bold text-xs text-blue-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>۲. ساعت ورود، خروج و استراحت</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (پیش‌فرض سیستم: ۰۷:۳۰ صبح تا ۱۶:۳۰ عصر)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ساعت ورود
                    </label>
                    <input
                      type="time"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      className="w-full bg-white text-slate-900 text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ساعت خروج
                    </label>
                    <input
                      type="time"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      className="w-full bg-white text-slate-900 text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      مدت استراحت و ناهار (دقیقه)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={15}
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(Number(e.target.value))}
                      className="w-full bg-white text-slate-900 text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Real-time Calculation Badge */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">ساعات خالص کارکرد:</span>
                      <span className="font-bold text-sm text-indigo-700 mr-1.5 font-mono">
                        {toPersianDigits(calculatedHours)} ساعت
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">اضافه کاری محاسبه‌شده:</span>
                      <span className="font-bold text-sm text-emerald-700 mr-1.5 font-mono">
                        {toPersianDigits(calculatedOvertime)} ساعت
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    فرمول: خروج - ورود - استراحت ({toPersianDigits(calculatedHours)} ساعت کار خالص)
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Notes for the day */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ۳. یادداشت یا توضیحات روزانه
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: کار روی شاسی دستگاه، مأموریت به انبار..."
                className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Section 4: EMBEDDED FINANCIAL ADJUSTMENTS WITH FREQUENT ITEMS / PRESETS */}
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-xs text-amber-900">
                    ۴. موارد مالی و تعدیلات این روز (پاداش، جریمه، ناهار، مساعده و...)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManagePresetsOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>مدیریت موارد پرتکرار ({toPersianDigits(activePresets.length)})</span>
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {toPersianDigits(dayAdjustments.length)} مورد ثبت‌شده
                  </span>
                </div>
              </div>

              {/* Quick Select Preset Pills Bar */}
              {activePresets.length > 0 && (
                <div className="space-y-1.5 bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/60">
                  <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      انتخاب سریع از موارد پرتکرار:
                    </span>
                    <span className="text-[10px] text-amber-800 font-normal">
                      (کلیک کنید تا مبلغ پیش‌فرض درج شود و در صورت نیاز مبلغ را تغییر دهید)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activePresets.map((preset) => {
                      const isSelected = activePresetSelectedId === preset.id;
                      const isAdd = preset.category === 'addition';
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            isSelected
                              ? 'ring-2 ring-blue-600 font-bold bg-white text-blue-900 border-blue-400 shadow-xs'
                              : isAdd
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={`انتخاب ${preset.title} با مبلغ ${formatCurrency(preset.defaultAmount, settings.currencyUnit)}`}
                        >
                          <span>{isAdd ? '+' : '-'}</span>
                          <span>{preset.title}</span>
                          <span className="font-mono text-[11px] opacity-75 font-normal">
                            ({formatCurrency(preset.defaultAmount, settings.currencyUnit, false)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List of Adjustments already added for this day */}
              {dayAdjustments.length > 0 && (
                <div className="space-y-2">
                  {dayAdjustments.map((adj) => {
                    const isBeingEdited = editingAdjustmentId === adj.id;
                    return (
                      <div
                        key={adj.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs shadow-xs transition ${
                          isBeingEdited
                            ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-400'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              adj.category === 'addition'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {adj.category === 'addition' ? 'پاداش / افزایش (+)' : 'جریمه / کسر (-)'}
                          </span>
                          <span className="font-semibold text-slate-800">{adj.title}</span>
                          {adj.notes && <span className="text-slate-500 text-[11px]">({adj.notes})</span>}
                          {isBeingEdited && (
                            <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-1.5 py-0.5 rounded">
                              در حال ویرایش
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold font-mono ${
                              adj.category === 'addition' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {adj.category === 'addition' ? '+' : '-'} {formatCurrency(adj.amount, settings.currencyUnit)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditAdjustment(adj)}
                            className={`p-1 rounded cursor-pointer transition ${
                              isBeingEdited
                                ? 'text-blue-700 bg-blue-100'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="ویرایش این مورد مالی"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdjustment(adj.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded cursor-pointer transition"
                            title="حذف این مورد مالی"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Add/Edit Adjustment Row */}
              <div
                className={`p-3 rounded-lg border space-y-2.5 shadow-xs transition ${
                  editingAdjustmentId
                    ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/30'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingAdjustmentId ? (
                      <span className="text-blue-800 font-bold flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        ویرایش مورد مالی ثبت‌شده:
                      </span>
                    ) : (
                      <span>+ افزودن مورد مالی به این روز:</span>
                    )}
                  </div>
                  {editingAdjustmentId ? (
                    <button
                      type="button"
                      onClick={handleCancelEditAdjustment}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      انصراف از ویرایش
                    </button>
                  ) : activePresetSelectedId ? (
                    <span className="text-[10px] text-blue-600 font-normal">
                      مورد پرتکرار انتخاب شده است. می‌توانید مبلغ آن را برای امروز تغییر دهید.
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">عنوان مورد مالی</label>
                    <select
                      value={newAdjTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewAdjTitle(val);
                        setActivePresetSelectedId(null);
                        if (val.includes('جریمه') || val.includes('کسری') || val.includes('مساعده') || val.includes('ناهار')) {
                          setNewAdjCategory('deduction');
                        } else {
                          setNewAdjCategory('addition');
                        }
                      }}
                      className="w-full bg-slate-50 text-slate-800 text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="پاداش کیفیت کار">پاداش کیفیت کار</option>
                      <option value="پاداش حضور و نظم">پاداش حضور و نظم</option>
                      <option value="پاداش عملکرد">پاداش عملکرد</option>
                      <option value="کمک هزینه ایاب و ذهاب">هزینه رفت‌وآمد</option>
                      <option value="ناهار">ناهار</option>
                      <option value="جریمه تأخیر">جریمه تأخیر</option>
                      <option value="جریمه غیبت">جریمه غیبت</option>
                      <option value="مساعده روزانه">مساعده نقدی</option>
                      <option value="custom">عنوان دلخواه / انتخاب از موارد پرتکرار...</option>
                    </select>
                  </div>

                  {newAdjTitle === 'custom' && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">عنوان دلخواه شما</label>
                      <input
                        type="text"
                        placeholder="عنوان مورد مالی..."
                        value={newAdjCustomTitle}
                        onChange={(e) => setNewAdjCustomTitle(e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs p-2 rounded-lg border border-slate-300 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">نوع تأثیر</label>
                    <select
                      value={newAdjCategory}
                      onChange={(e) => setNewAdjCategory(e.target.value as AdjustmentCategory)}
                      className="w-full bg-slate-50 text-slate-800 text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="addition">افزایشی (اضافه به حقوق +)</option>
                      <option value="deduction">کاهشی (کسر از حقوق -)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">
                      مبلغ ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="مبلغ..."
                      value={newAdjAmount}
                      onChange={(e) => setNewAdjAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white text-slate-800 text-xs p-2 rounded-lg border border-slate-300 font-mono focus:border-blue-500 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="علت یا توضیحات مورد مالی (اختیاری)..."
                    value={newAdjNotes}
                    onChange={(e) => setNewAdjNotes(e.target.value)}
                    className="flex-1 bg-slate-50 text-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAdjustment}
                    className={`text-xs font-bold px-4 py-1.5 rounded-lg transition cursor-pointer shadow-xs shrink-0 ${
                      editingAdjustmentId
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {editingAdjustmentId ? '✓ ذخیره تغییرات این مورد' : '+ افزودن به این روز'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 5: Live Daily Net Salary Summary */}
            {(() => {
              const tempRecord: WorkRecord = {
                id: existingRecord?.id || 'temp',
                workerId: worker.id,
                jalaliDate: dateStr,
                year,
                month,
                day: dayNumber,
                status,
                entryTime: entryTime || '',
                exitTime: exitTime || '',
                breakDurationMinutes: breakMinutes,
                workedHours: calculatedHours,
                overtimeHours: calculatedOvertime,
                notes,
                updatedAt: new Date().toISOString(),
              };
              const wage = calculateDailyWageBreakdown(worker, tempRecord, dayAdjustments, settings);

              return (
                <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      ﷼
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-300">حقوق خالص محاسبه‌شده این روز:</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {formatCurrency(wage.netWage, settings.currencyUnit)}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 flex items-center gap-3 font-mono flex-wrap">
                    <span>پایه: {formatCurrency(wage.baseWage, settings.currencyUnit, false)}</span>
                    {wage.overtimeWage > 0 && (
                      <span className="text-emerald-400">+ اضافه کاری: {formatCurrency(wage.overtimeWage, settings.currencyUnit, false)}</span>
                    )}
                    {wage.additions > 0 && (
                      <span className="text-emerald-400">+ پاداش: {formatCurrency(wage.additions, settings.currencyUnit, false)}</span>
                    )}
                    {wage.deductions > 0 && (
                      <span className="text-rose-400">- کسورات: {formatCurrency(wage.deductions, settings.currencyUnit, false)}</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 flex-wrap">
              <div>
                {(existingRecord || existingAdjustments.length > 0) && onDelete && (
                  showConfirmDelete ? (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg animate-fadeIn">
                      <span className="text-xs font-bold text-rose-800">حذف کامل کارکرد این روز؟</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(worker.id, year, month, dayNumber);
                          onClose();
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1 rounded-md transition cursor-pointer"
                      >
                        بله، حذف کن
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-lg transition cursor-pointer"
                      title="حذف کامل ساعات کارکرد و موارد مالی این روز"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف کارکرد این روز</span>
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                >
                  ذخیره کارکرد و موارد مالی
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Manage Presets Modal */}
      {isManagePresetsOpen && (
        <ManagePresetsModal
          presets={presets}
          settings={settings}
          onSavePresets={handleUpdatePresets}
          onClose={() => setIsManagePresetsOpen(false)}
        />
      )}
    </>
  );
};

