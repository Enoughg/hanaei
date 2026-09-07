import React, { useState, useRef } from 'react';
import { AdjustmentPreset, AdjustmentCategory, FinancialAdjustmentType, AppSettings } from '../types';
import { formatCurrency, toPersianDigits } from '../utils/jalali';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Bookmark,
  Gift,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ManagePresetsModalProps {
  presets: AdjustmentPreset[];
  settings: AppSettings;
  onSavePresets: (presets: AdjustmentPreset[]) => void;
  onClose: () => void;
}

export const ManagePresetsModal: React.FC<ManagePresetsModalProps> = ({
  presets,
  settings,
  onSavePresets,
  onClose,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'addition' | 'deduction'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editing state (null for creating new)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AdjustmentCategory>('deduction');
  const [type, setType] = useState<FinancialAdjustmentType>('deduction');
  const [defaultAmount, setDefaultAmount] = useState<number | ''>(50000);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = () => {
    setEditingPresetId(null);
    setTitle('');
    setCategory('deduction');
    setType('deduction');
    setDefaultAmount(50000);
    setIsActive(true);
    setNotes('');
    setErrorMessage('');
  };

  const handleStartEdit = (preset: AdjustmentPreset) => {
    setEditingPresetId(preset.id);
    setDeletingPresetId(null);
    setTitle(preset.title);
    setCategory(preset.category);
    setType(preset.type || (preset.category === 'addition' ? 'bonus' : 'deduction'));
    setDefaultAmount(preset.defaultAmount);
    setIsActive(preset.isActive);
    setNotes(preset.notes || '');
    setErrorMessage('');
    
    // Smooth scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleToggleActive = (id: string) => {
    const updated = presets.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    onSavePresets(updated);
  };

  const handleConfirmDelete = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    onSavePresets(updated);
    setDeletingPresetId(null);
    if (editingPresetId === id) {
      resetForm();
    }
    setSuccessMessage('مورد پرتکرار با موفقیت حذف شد.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('لطفاً عنوان مورد پرتکرار را وارد کنید.');
      return;
    }
    if (defaultAmount === '' || Number(defaultAmount) < 0) {
      setErrorMessage('لطفاً مبلغ پیش‌فرض معتبری وارد کنید.');
      return;
    }

    if (editingPresetId) {
      // Update existing preset
      const updated = presets.map((p) => {
        if (p.id === editingPresetId) {
          return {
            ...p,
            title: title.trim(),
            category,
            type,
            defaultAmount: Number(defaultAmount),
            isActive,
            notes: notes.trim(),
          };
        }
        return p;
      });
      onSavePresets(updated);
      setSuccessMessage('مورد پرتکرار با موفقیت ویرایش و ذخیره شد.');
      resetForm();
    } else {
      // Create new preset
      const newPreset: AdjustmentPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: title.trim(),
        category,
        type,
        defaultAmount: Number(defaultAmount),
        isActive,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      onSavePresets([...presets, newPreset]);
      setSuccessMessage('مورد پرتکرار جدید با موفقیت اضافه شد.');
      resetForm();
    }

    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredPresets = presets.filter((p) => {
    if (filterTab !== 'all' && p.category !== filterTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.notes && p.notes.toLowerCase().includes(q));
    }
    return true;
  });

  const additionCount = presets.filter((p) => p.category === 'addition').length;
  const deductionCount = presets.filter((p) => p.category === 'deduction').length;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                مدیریت موارد پرتکرار (کسورات، پاداش‌ها و ناهار)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعریف، ویرایش و حذف موارد متداول جهت انتخاب سریع هنگام ثبت کارکرد روزانه کارگران
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Alert */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              نکته: ویرایش یا حذف این موارد فقط بر روی انتخاب‌های آینده تأثیر می‌گذارد و سوابق مالی قبلی ثبت‌شده برای کارگران تغییر نخواهد کرد.
            </span>
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Add / Edit Form Card */}
          <div
            ref={formRef}
            className={`border rounded-xl p-4 transition shadow-xs ${
              editingPresetId
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                {editingPresetId ? (
                  <>
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900">
                      در حال ویرایش مورد پرتکرار: <strong className="font-extrabold text-blue-700">{title || '...'}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>افزودن مورد پرتکرار جدید</span>
                  </>
                )}
              </h4>
              {editingPresetId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>انصراف از ویرایش</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    عنوان مورد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ناهار، پاداش عملکرد، جریمه تأخیر..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    نوع مالی <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value as AdjustmentCategory;
                      setCategory(newCat);
                      setType(newCat === 'addition' ? 'bonus' : 'deduction');
                    }}
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                  >
                    <option value="deduction">کسورات (کسر از حقوق -)</option>
                    <option value="addition">تشویقی (افزایش به حقوق +)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    مبلغ پیش‌فرض ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    placeholder="مثلاً ۵۰,۰۰۰"
                    value={defaultAmount}
                    onChange={(e) => setDefaultAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    دسته‌بندی سیستمی
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FinancialAdjustmentType)}
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {category === 'addition' ? (
                      <>
                        <option value="bonus">پاداش و تشویقی عمومی</option>
                        <option value="commute_cost">کمک هزینه ایاب و ذهاب</option>
                        <option value="allowance">حق مزایا و رفاهی</option>
                        <option value="custom">سایر تشویقی‌ها</option>
                      </>
                    ) : (
                      <>
                        <option value="deduction">کسورات و ناهار / هزینه</option>
                        <option value="penalty">جریمه تأخیر یا غیبت یا خسارت</option>
                        <option value="advance">مساعده یا پیش‌پرداخت</option>
                        <option value="on_account">علی‌الحساب</option>
                        <option value="custom">سایر کسورات</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-center">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    توضیحات پیش‌فرض (اختیاری)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: کسر هزینه ناهار روزانه، پاداش کیفیت کار..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold text-xs">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>فعال در انتخاب سریع</span>
                  </label>

                  <button
                    type="submit"
                    className={`font-bold px-5 py-2 rounded-lg transition cursor-pointer shadow-xs ${
                      editingPresetId
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {editingPresetId ? '✓ ذخیره تغییرات' : '+ افزودن به لیست'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Presets List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  همه موارد ({toPersianDigits(presets.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('addition')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    filterTab === 'addition'
                      ? 'bg-white text-emerald-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تشویقی‌ها ({toPersianDigits(additionCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('deduction')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    filterTab === 'deduction'
                      ? 'bg-white text-rose-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  کسورات ({toPersianDigits(deductionCount)})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجوی عنوان مورد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Presets Table / Cards */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">عنوان مورد پرتکرار</th>
                    <th className="py-3 px-4 text-center">نوع</th>
                    <th className="py-3 px-4 text-center">مبلغ پیش‌فرض</th>
                    <th className="py-3 px-4">توضیحات</th>
                    <th className="py-3 px-4 text-center">وضعیت</th>
                    <th className="py-3 px-4 text-center">عملیات (ویرایش / حذف)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPresets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        موردی یافت نشد. می‌توانید با استفاده از فرم بالا مورد جدید اضافه کنید.
                      </td>
                    </tr>
                  ) : (
                    filteredPresets.map((preset) => {
                      const isBeingEdited = editingPresetId === preset.id;
                      const isConfirmingDelete = deletingPresetId === preset.id;

                      return (
                        <tr
                          key={preset.id}
                          className={`transition ${
                            isBeingEdited
                              ? 'bg-blue-50/80 font-semibold'
                              : isConfirmingDelete
                              ? 'bg-rose-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  preset.category === 'addition' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{preset.title}</span>
                              {isBeingEdited && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-normal">
                                  در حال ویرایش
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                preset.category === 'addition'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {preset.category === 'addition' ? 'تشویقی (+)' : 'کسورات (-)'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span
                              className={
                                preset.category === 'addition' ? 'text-emerald-700' : 'text-rose-700'
                              }
                            >
                              {formatCurrency(preset.defaultAmount, settings.currencyUnit)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {preset.notes || '-'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(preset.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                preset.isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title="برای تغییر وضعیت کلیک کنید"
                            >
                              {preset.isActive ? 'فعال' : 'غیرفعال'}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isConfirmingDelete ? (
                              <div className="inline-flex items-center gap-1.5 bg-rose-100/80 border border-rose-300 px-2 py-1 rounded-lg animate-fadeIn">
                                <span className="text-[11px] font-bold text-rose-900">حذف شود؟</span>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDelete(preset.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition"
                                >
                                  بله، حذف
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPresetId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition"
                                >
                                  انصراف
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(preset)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    isBeingEdited
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                                  }`}
                                  title="ویرایش این مورد"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>ویرایش</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingPresetId(preset.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                  title="حذف این مورد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            تعداد کل موارد: <strong className="text-slate-800 font-mono">{toPersianDigits(presets.length)}</strong> مورد
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            بستن و ذخیره
          </button>
        </div>
      </div>
    </div>
  );
};

