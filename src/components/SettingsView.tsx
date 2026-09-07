import React, { useState } from 'react';
import { AppSettings, CurrencyUnit, AdjustmentPreset } from '../types';
import {
  Settings,
  Building2,
  Clock,
  CircleDollarSign,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Save,
  SlidersHorizontal,
  Briefcase,
  Plus,
  X,
  Shield,
  KeyRound,
  User,
  Calendar,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  exportAllDataAsJSON,
  importAllDataFromJSON,
  resetToSampleData,
  clearAllData,
  loadAdjustmentPresets,
  saveAdjustmentPresets,
  DEFAULT_JOB_ROLES,
} from '../services/storage';
import { ManagePresetsModal } from './ManagePresetsModal';
import { JALALI_MONTH_NAMES, getAvailableJalaliYears, toPersianDigits } from '../utils/jalali';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onReloadAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onReloadAllData,
}) => {
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    jobRoles: settings.jobRoles && settings.jobRoles.length > 0 ? settings.jobRoles : DEFAULT_JOB_ROLES,
    authConfig: settings.authConfig || {
      isEnabled: true,
      username: 'admin',
      password: '123',
      displayName: 'مدیر کارگاه',
    },
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);
  const [presets, setPresets] = useState<AdjustmentPreset[]>(() => loadAdjustmentPresets());

  // Job Role input state
  const [newRoleInput, setNewRoleInput] = useState('');
  const [roleError, setRoleError] = useState('');

  // Password change state
  const [newPassword, setNewPassword] = useState(formData.authConfig?.password || '123');
  const [confirmPassword, setConfirmPassword] = useState(formData.authConfig?.password || '123');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const availableYears = getAvailableJalaliYears(1400, 1450);

  const handleAddJobRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;

    const currentRoles = formData.jobRoles || [];
    if (currentRoles.includes(trimmed)) {
      setRoleError('این عنوان شغلی قبلاً در لیست ثبت شده است.');
      return;
    }

    setFormData({
      ...formData,
      jobRoles: [...currentRoles, trimmed],
    });
    setNewRoleInput('');
    setRoleError('');
  };

  const handleRemoveJobRole = (roleToRemove: string) => {
    const currentRoles = formData.jobRoles || [];
    setFormData({
      ...formData,
      jobRoles: currentRoles.filter((r) => r !== roleToRemove),
    });
  };

  const handleResetJobRoles = () => {
    if (window.confirm('آیا از بازنشانی عناوین شغلی به حالت پیش‌فرض اطمینان دارید؟')) {
      setFormData({
        ...formData,
        jobRoles: [...DEFAULT_JOB_ROLES],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validate passwords
    if (formData.authConfig?.isEnabled) {
      if (!formData.authConfig.username?.trim()) {
        setPasswordError('نام کاربری نمی‌تواند خالی باشد.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('رمز عبور جدید و تکرار آن یکسان نیستند.');
        return;
      }
      if (!newPassword) {
        setPasswordError('رمز عبور نمی‌تواند خالی باشد.');
        return;
      }
    }

    const updatedSettings: AppSettings = {
      ...formData,
      authConfig: {
        isEnabled: formData.authConfig?.isEnabled ?? true,
        username: formData.authConfig?.username?.trim() || 'admin',
        password: newPassword,
        displayName: formData.authConfig?.displayName?.trim() || formData.managerName || 'مدیر کارگاه',
      },
    };

    onUpdateSettings(updatedSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdatePresets = (updatedPresets: AdjustmentPreset[]) => {
    setPresets(updatedPresets);
    saveAdjustmentPresets(updatedPresets);
  };

  const handleExportJSON = () => {
    exportAllDataAsJSON();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = importAllDataFromJSON(content);
      if (success) {
        setImportStatus('اطلاعات با موفقیت بازیابی شد.');
        onReloadAllData();
      } else {
        setImportStatus('خطا در خواندن فایل پشتیبان. لطفاً فایل معتبر انتخاب کنید.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleResetSample = () => {
    if (window.confirm('آیا از بارگذاری مجدد اطلاعات نمونه مطمئن هستید؟')) {
      resetToSampleData();
      onReloadAllData();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('هشدار: آیا مطمئن هستید که می‌خواهید تمام اطلاعات برنامه را پاک کنید؟')) {
      clearAllData();
      onReloadAllData();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-bold text-slate-800">
              تنظیمات عمومی، کاربری و پشتیبان‌گیری
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            پیکربندی کارگاه، عناوین شغلی کارگران، دوره پیش‌فرض کارکرد و حساب کاربری امنیتی سامانه
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>تنظیمات با موفقیت ذخیره شد</span>
          </div>
        )}
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            importStatus.includes('موفقیت')
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {passwordError && (
        <div className="p-4 rounded-xl border bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4" />
          <span>{passwordError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Workshop Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-slate-800">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>مشخصات پایه کارگاه و مدیریت</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                نام کارگاه / شرکت / مجموعه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.workshopName}
                onChange={(e) =>
                  setFormData({ ...formData, workshopName: e.target.value })
                }
                placeholder="مثال: کارگاه تراشکاری پیشرو"
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                نام کارفرما / مدیر کارگاه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.managerName}
                onChange={(e) =>
                  setFormData({ ...formData, managerName: e.target.value })
                }
                placeholder="مثال: مهندس رضایی"
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                شماره تماس کارگاه
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="مثال: 02188888888"
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                واحد پولی پیش‌فرض محاسبات
              </label>
              <select
                value={formData.currencyUnit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currencyUnit: e.target.value as CurrencyUnit,
                  })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="toman">تومان</option>
                <option value="rial">ریال</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                آدرس کارگاه (در فیش حقوقی و خروجی‌ها درج می‌شود)
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="مثال: تهران، شهرک صنعتی شمس‌آباد، بلوار بوستان، پلاک ۱۲"
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Job Titles Management (مدیریت عناوین شغلی و سمت‌ها) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>مدیریت عناوین شغلی و سمت‌های کارگران (جهت انتخاب در فرم کارگر)</span>
            </div>
            <button
              type="button"
              onClick={handleResetJobRoles}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              بازنشانی به پیش‌فرض
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            عناوین شغلی تعریف‌شده در این بخش، هنگام افزودن کارگر جدید یا ویرایش کارگران در قالب لیست انتخابی (Dropdown) و دکمه‌های انتخاب سریع نمایش داده می‌شوند.
          </p>

          {/* Add Job Role Form */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newRoleInput}
              onChange={(e) => setNewRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddJobRole();
                }
              }}
              placeholder="عنوان شغل جدید (مثال: اپراتور لیزر، کارشناس فنی، مونتاژکار)..."
              className="flex-1 bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddJobRole}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن شغل +</span>
            </button>
          </div>

          {roleError && (
            <p className="text-xs text-rose-600 font-medium">{roleError}</p>
          )}

          {/* Job Roles Chips List */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-600 mb-2.5 flex items-center justify-between">
              <span>عناوین شغلی فعال در سامانه ({toPersianDigits(formData.jobRoles?.length || 0)} عنوان):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.jobRoles || []).map((role) => (
                <div
                  key={role}
                  className="group flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg shadow-xs hover:border-blue-300 transition"
                >
                  <Briefcase className="w-3 h-3 text-blue-600" />
                  <span className="font-medium">{role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveJobRole(role)}
                    title="حذف این شغل از لیست انتخابی"
                    className="text-slate-400 hover:text-rose-600 transition p-0.5 rounded cursor-pointer mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Default Attendance Period (دوره و سال پیش‌فرض ثبت کارکرد) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>تنظیمات دوره زمانی و پیش‌فرض صفحه ثبت کارکرد</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            می‌توانید سال و ماه پیش‌فرض سامانه را مشخص کنید تا در صورت مراجعه به بخش کارکرد ماهانه، جدول بلافاصله روی این دوره باز شود. همچنین با تغییر ماه در جدول، آخرین ماه انتخابی شما در سیستم به صورت خودکار ذخیره می‌شود.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                سال پیش‌فرض ثبت کارکرد (تا سال ۱۴۵۰)
              </label>
              <select
                value={formData.defaultYear || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultYear: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
              >
                <option value="">سال جاری سیستم (پیش‌فرض هوشمند)</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    سال {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ماه پیش‌فرض ثبت کارکرد
              </label>
              <select
                value={formData.defaultMonth || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultMonth: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="">ماه جاری سیستم (پیش‌فرض هوشمند)</option>
                {JALALI_MONTH_NAMES.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m} (ماه {toPersianDigits(idx + 1)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Security & User Authentication (امنیت و کاربر سامانه) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>مدیریت حساب کاربری و رمز عبور ورود به سامانه</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.authConfig?.isEnabled ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    authConfig: {
                      ...(formData.authConfig || { username: 'admin', password: '123' }),
                      isEnabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                فعال‌سازی قفل و رمز عبور ورود
              </span>
            </label>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            نام کاربری در باکس ورود به سامانه ثابت می‌ماند و تنها با وارد کردن رمز عبور تعیین‌شده، دسترسی به محیط کارگاه باز می‌شود.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Username */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                نام کاربری ورود (در صفحه ورود نمایش داده می‌شود) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.authConfig?.username || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      authConfig: {
                        ...(formData.authConfig || { password: '123', isEnabled: true }),
                        username: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: admin"
                  className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                عنوان یا نام نمایشی کاربر
              </label>
              <input
                type="text"
                value={formData.authConfig?.displayName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    authConfig: {
                      ...(formData.authConfig || { username: 'admin', password: '123', isEnabled: true }),
                      displayName: e.target.value,
                    },
                  })
                }
                placeholder="مثال: مهندس رضایی (مدیر کارگاه)"
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">
                  رمز عبور جدید سامانه <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'مخفی‌سازی' : 'نمایش'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="رمز عبور جدید"
                  className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                تکرار رمز عبور جدید <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز عبور"
                  className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Work Hours and Shifts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-slate-800">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>ساعات کاری و ضرایب پیش‌فرض کارگاه</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ساعت کار استاندارد روزانه
              </label>
              <input
                type="number"
                min={1}
                max={16}
                value={formData.defaultDailyHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultDailyHours: Number(e.target.value),
                  })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ضریب اضافه کاری پیش‌فرض
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="3"
                value={formData.defaultOvertimeMultiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultOvertimeMultiplier: Number(e.target.value),
                  })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ساعت ورود پیش‌فرض (صفحه ثبت کارکرد)
              </label>
              <input
                type="time"
                value={formData.workStartHour || '07:30'}
                onChange={(e) =>
                  setFormData({ ...formData, workStartHour: e.target.value })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                ساعت خروج پیش‌فرض (صفحه ثبت کارکرد)
              </label>
              <input
                type="time"
                value={formData.workEndHour || '16:30'}
                onChange={(e) =>
                  setFormData({ ...formData, workEndHour: e.target.value })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                مدت زمان استراحت و ناهار (دقیقه)
              </label>
              <input
                type="number"
                min={0}
                step={15}
                value={formData.defaultBreakMinutes ?? 60}
                onChange={(e) =>
                  setFormData({ ...formData, defaultBreakMinutes: Number(e.target.value) })
                }
                className="w-full bg-white text-slate-800 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Frequent Items (موارد پرتکرار مالی) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>مدیریت الگوها و موارد پرتکرار (پاداش، جریمه، ناهار و...)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsManagePresetsOpen(true)}
              className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>ویرایش و تعریف موارد پرتکرار</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            با تعریف موارد پرتکرار مانند «پاداش عملکرد»، «ناهار»، «جریمه تأخیر» و تعیین مبالغ پیش‌فرض آن‌ها، می‌توانید در هنگام ثبت کارکرد روزانه تنها با یک کلیک این موارد را اعمال و در صورت نیاز مبلغ را تغییر دهید.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره کلیه تنظیمات</span>
          </button>
        </div>
      </form>

      {/* Section 7: Data Backup, Restore & Reset */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-slate-800">
          <Download className="w-4 h-4 text-blue-600" />
          <span>پشتیبان‌گیری (Backup) و بازیابی داده‌ها</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          تمام اطلاعات شما در حافظه محلی ذخیره می‌شود. جهت اطمینان، می‌توانید در هر زمان فایل پشتیبان کامل سیستم را دانلود کنید یا در سیستم دیگر بازیابی نمایید.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Download Backup */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold p-3 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>دانلود فایل پشتیبان (JSON)</span>
          </button>

          {/* Upload Backup */}
          <label className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold p-3 rounded-lg border border-slate-200 transition cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>بازیابی از فایل پشتیبان</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {/* Reset Demo Data */}
          <button
            type="button"
            onClick={handleResetSample}
            className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold p-3 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>بارگذاری مجدد اطلاعات نمونه</span>
          </button>

          {/* Clear All */}
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold p-3 rounded-lg border border-rose-200 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>حذف تمام داده‌ها</span>
          </button>
        </div>
      </div>

      {/* Presets Modal */}
      {isManagePresetsOpen && (
        <ManagePresetsModal
          presets={presets}
          settings={settings}
          onSavePresets={handleUpdatePresets}
          onClose={() => setIsManagePresetsOpen(false)}
        />
      )}
    </div>
  );
};
