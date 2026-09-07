import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  FolderKanban,
  CheckCircle2,
  XCircle,
  Phone,
  CreditCard,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  FileSpreadsheet,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import {
  Worker,
  WageType,
  AppSettings,
  WorkRecord,
  FinancialAdjustment,
  Payment,
} from '../types';
import { toPersianDigits, formatCurrency } from '../utils/jalali';
import { DEFAULT_JOB_ROLES } from '../services/storage';

interface WorkersViewProps {
  workers: Worker[];
  workRecords?: WorkRecord[];
  adjustments?: FinancialAdjustment[];
  payments?: Payment[];
  settings: AppSettings;
  onSaveWorker: (worker: Worker) => void;
  onDeleteWorker: (workerId: string) => void;
  onOpenWorkerPortal: (worker: Worker) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const WorkersView: React.FC<WorkersViewProps> = ({
  workers,
  workRecords = [],
  adjustments = [],
  payments = [],
  settings,
  onSaveWorker,
  onDeleteWorker,
  onOpenWorkerPortal,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [wageTypeFilter, setWageTypeFilter] = useState<'all' | WageType>('all');

  // Defined and active job titles/roles
  const availableRoles = useMemo(() => {
    const configured = settings.jobRoles && settings.jobRoles.length > 0 ? settings.jobRoles : DEFAULT_JOB_ROLES;
    const workerRoles = workers.map((w) => w.role).filter(Boolean);
    const set = new Set([...configured, ...workerRoles]);
    return Array.from(set);
  }, [settings.jobRoles, workers]);

  // Edit / Add modal state
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Worker>>({
    fullName: '',
    code: '',
    nationalId: '',
    phone: '',
    role: availableRoles[0] || 'کارگر ساده',
    contractType: 'تمام وقت',
    wageType: 'daily',
    baseRate: 650000,
    overtimeRateMultiplier: 1.4,
    startDate: '1403/01/01',
    isActive: true,
    notes: '',
    accountNumber: '',
    cardNumber: '',
    shabaNumber: '',
    accountOwner: '',
  });
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    const nextCode = (workers.length + 101).toString();
    setFormData({
      fullName: '',
      code: nextCode,
      nationalId: '',
      phone: '',
      role: availableRoles[0] || 'کارگر ساده',
      contractType: 'تمام وقت',
      wageType: 'daily',
      baseRate: 650000,
      overtimeRateMultiplier: 1.4,
      startDate: '1403/01/01',
      isActive: true,
      notes: '',
      accountNumber: '',
      cardNumber: '',
      shabaNumber: '',
      accountOwner: '',
      avatarColor: '#2563eb',
    });
    setEditingWorker(null);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      ...worker,
      cardNumber: worker.cardNumber || worker.accountNumber || '',
      shabaNumber: worker.shabaNumber || '',
      accountOwner: worker.accountOwner || '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName?.trim()) {
      setFormError('نام و نام خانوادگی الزامی است.');
      return;
    }
    if (!formData.code?.trim()) {
      setFormError('کد کارگر الزامی است.');
      return;
    }
    if (!formData.baseRate || formData.baseRate <= 0) {
      setFormError('مبلغ دستمزد باید بیشتر از صفر باشد.');
      return;
    }

    // Check duplicate code
    const existing = workers.find(
      (w) => w.code === formData.code && (!editingWorker || w.id !== editingWorker.id)
    );
    if (existing) {
      setFormError(`کد کارگر «${formData.code}» قبلاً برای «${existing.fullName}» ثبت شده است.`);
      return;
    }

    const colors = ['#2563eb', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const cardNum = formData.cardNumber?.trim() || formData.accountNumber?.trim() || '';
    const shabaNum = formData.shabaNumber?.trim() || '';
    const accOwner = formData.accountOwner?.trim() || '';

    const workerToSave: Worker = {
      id: editingWorker ? editingWorker.id : `w-${Date.now()}`,
      code: formData.code!.trim(),
      fullName: formData.fullName!.trim(),
      nationalId: formData.nationalId?.trim() || '',
      phone: formData.phone?.trim() || '',
      role: formData.role?.trim() || 'کارگر ساده',
      contractType: formData.contractType || 'تمام وقت',
      wageType: formData.wageType || 'daily',
      baseRate: Number(formData.baseRate) || 0,
      overtimeRateMultiplier: Number(formData.overtimeRateMultiplier) || 1.4,
      startDate: formData.startDate || '1403/01/01',
      isActive: formData.isActive ?? true,
      notes: formData.notes?.trim() || '',
      accountNumber: cardNum,
      cardNumber: cardNum,
      shabaNumber: shabaNum,
      accountOwner: accOwner,
      avatarColor: editingWorker?.avatarColor || randomColor,
    };

    onSaveWorker(workerToSave);
    setIsAddModalOpen(false);
    setEditingWorker(null);
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = w.fullName.toLowerCase().includes(query);
        const matchCode = w.code.includes(query);
        const matchPhone = w.phone.includes(query);
        const matchRole = w.role.toLowerCase().includes(query);
        const matchNational = w.nationalId.includes(query);
        if (!matchName && !matchCode && !matchPhone && !matchRole && !matchNational) return false;
      }
      // Status
      if (statusFilter === 'active' && !w.isActive) return false;
      if (statusFilter === 'inactive' && w.isActive) return false;
      // Wage type
      if (wageTypeFilter !== 'all' && w.wageType !== wageTypeFilter) return false;
      return true;
    });
  }, [workers, searchQuery, statusFilter, wageTypeFilter]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-bold text-slate-800">مدیریت پرسنل و کارگران</h2>
          </div>
          <p className="text-xs text-slate-500">
            فهرست کامل کارگران کارگاه، مشخصات قرارداد، نرخ‌های دستمزد و ورود به کارتابل اختصاصی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-add-worker-main"
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>افزودن کارگر جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Search input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="worker-search-input"
            type="text"
            placeholder="جستجو با نام، کد، شماره تماس، شغل، کد ملی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 text-xs pr-10 pl-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>وضعیت:</span>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه ({toPersianDigits(workers.length)})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فعال ({toPersianDigits(workers.filter((w) => w.isActive).length)})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              غیرفعال ({toPersianDigits(workers.filter((w) => !w.isActive).length)})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2 font-medium">
            <span>نوع دستمزد:</span>
          </div>
          <select
            value={wageTypeFilter}
            onChange={(e) => setWageTypeFilter(e.target.value as any)}
            aria-label="فیلتر نوع دستمزد"
            className="bg-white text-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">همه انواع دستمزد</option>
            <option value="daily">روزمزد</option>
            <option value="hourly">ساعتی</option>
            <option value="monthly">ماهانه</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">کد / مشخصات کارگر</th>
                <th className="py-3.5 px-4">کد ملی / تماس</th>
                <th className="py-3.5 px-4">شغل و سمت</th>
                <th className="py-3.5 px-4">نوع همکاری</th>
                <th className="py-3.5 px-4">نرخ دستمزد</th>
                <th className="py-3.5 px-4">شروع همکاری</th>
                <th className="py-3.5 px-4 text-center">وضعیت</th>
                <th className="py-3.5 px-4 text-center">عملیات و کارتابل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    هیچ کارگری با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0"
                          style={{ backgroundColor: worker.avatarColor || '#3b82f6' }}
                        >
                          {worker.fullName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{worker.fullName}</span>
                            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              کد: {worker.code}
                            </span>
                          </div>
                          {worker.notes && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {worker.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">کد ملی:</span>
                        <span className="font-mono text-slate-700">{toPersianDigits(worker.nationalId || '-')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-slate-700">{toPersianDigits(worker.phone || '-')}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        <span>{worker.role}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-medium">
                        {worker.contractType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-bold text-emerald-700 font-mono">
                        {formatCurrency(worker.baseRate, settings.currencyUnit)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {worker.wageType === 'daily'
                          ? 'روزانه'
                          : worker.wageType === 'hourly'
                          ? 'ساعتی'
                          : 'ماهانه'}
                        {' | '}
                        ضریب اضافه: {toPersianDigits(worker.overtimeRateMultiplier || 1.4)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {toPersianDigits(worker.startDate)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                          worker.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {worker.isActive ? (
                          <>
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>فعال</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>غیرفعال</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-portal-${worker.id}`}
                          onClick={() => onOpenWorkerPortal(worker)}
                          title="مشاهده کارتابل اختصاصی"
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                          <span>کارتابل</span>
                        </button>

                        <button
                          id={`btn-edit-${worker.id}`}
                          onClick={() => openEditModal(worker)}
                          title="ویرایش اطلاعات"
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 p-1.5 rounded-lg transition border border-slate-200 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-${worker.id}`}
                          onClick={() => setDeleteConfirmId(worker.id)}
                          title="حذف کارگر"
                          className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition border border-slate-200 hover:border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Worker Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingWorker ? `ویرایش کارگر: ${editingWorker.fullName}` : 'افزودن کارگر جدید'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نام و نام خانوادگی <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="مثال: رضا حسینی"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Worker Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    کد پرسنلی / کارگر <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: 101"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    کد ملی
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId || ''}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="۱۰ رقم کد ملی"
                    maxLength={10}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شماره تماس همراه
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="مثال: 09121234567"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Role with Dropdown & Fast Selection */}
                <div className="sm:col-span-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      شغل / عنوان سمت <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">انتخاب از لیست یا تایپ عنوان جدید</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Dropdown Select from Defined Roles */}
                    <div className="relative">
                      <select
                        value={availableRoles.includes(formData.role || '') ? formData.role : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') {
                            setFormData({ ...formData, role: e.target.value });
                          }
                        }}
                        className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                      >
                        <option value="" disabled>-- انتخاب عنوان شغلی از لیست --</option>
                        {availableRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        <option value="custom">-- سایر (تایپ دستی عنوان شغل) --</option>
                      </select>
                    </div>

                    {/* Direct Text Input for Custom or Exact Role */}
                    <div>
                      <input
                        type="text"
                        required
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="عنوان دقیق شغل کارگر..."
                        className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Quick Role Selection Pills */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">مشاغل متداول:</span>
                    {availableRoles.slice(0, 6).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r })}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          formData.role === r
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نوع همکاری / قرارداد
                  </label>
                  <select
                    value={formData.contractType || 'تمام وقت'}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="تمام وقت">تمام وقت</option>
                    <option value="پاره وقت">پاره وقت</option>
                    <option value="روزمزد">روزمزد</option>
                    <option value="پیمانکاری">پیمانکاری</option>
                    <option value="آزمایشی">آزمایشی</option>
                  </select>
                </div>

                {/* Wage Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نوع دستمزد <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.wageType || 'daily'}
                    onChange={(e) => setFormData({ ...formData, wageType: e.target.value as WageType })}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="daily">روزانه (روزمزد)</option>
                    <option value="hourly">ساعتی</option>
                    <option value="monthly">ماهانه ثابت</option>
                  </select>
                </div>

                {/* Base Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    مبلغ دستمزد پایه ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'}) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.baseRate || ''}
                    onChange={(e) => setFormData({ ...formData, baseRate: Number(e.target.value) })}
                    placeholder="مثال: 650000"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {formatCurrency(formData.baseRate || 0, settings.currencyUnit)}
                  </span>
                </div>

                {/* Overtime Multiplier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ضریب اضافه کاری
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="3"
                    value={formData.overtimeRateMultiplier || 1.4}
                    onChange={(e) => setFormData({ ...formData, overtimeRateMultiplier: Number(e.target.value) })}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    طبق قانون کار: ۱.۴ برابر نرخ هر ساعت
                  </span>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاریخ شروع همکاری (شمسی)
                  </label>
                  <input
                    type="text"
                    value={formData.startDate || '1403/01/01'}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    placeholder="1403/01/01"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شماره کارت بانکی (۱۶ رقم)
                  </label>
                  <input
                    type="text"
                    maxLength={19}
                    value={formData.cardNumber || formData.accountNumber || ''}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value, accountNumber: e.target.value })}
                    placeholder="مثال: 6037991823456789"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Shaba Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شماره شبا (IBAN)
                  </label>
                  <input
                    type="text"
                    maxLength={26}
                    value={formData.shabaNumber || ''}
                    onChange={(e) => setFormData({ ...formData, shabaNumber: e.target.value })}
                    placeholder="مثال: IR120120000000001234567890"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* Account Owner */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نام صاحب حساب (در صورت تفاوت با نام کارگر)
                  </label>
                  <input
                    type="text"
                    value={formData.accountOwner || ''}
                    onChange={(e) => setFormData({ ...formData, accountOwner: e.target.value })}
                    placeholder="پیش‌فرض: همان نام و نام خانوادگی کارگر"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    توضیحات و مهارت‌ها
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="سوابق، مهارت‌ها و یادداشت‌های پرسنلی..."
                    className="w-full bg-white text-slate-800 text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Active Switch */}
                <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveWorker"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded bg-white border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="isActiveWorker" className="text-xs font-bold text-slate-800 cursor-pointer">
                    کارگر فعال است (در جدول ثبت کارکرد ماهانه نمایش داده شود)
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                >
                  {editingWorker ? 'ذخیره تغییرات' : 'ثبت کارگر جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const targetWorker = workers.find((w) => w.id === deleteConfirmId);
        const linkedRecordsCount = workRecords.filter((r) => r.workerId === deleteConfirmId).length;
        const linkedAdjustmentsCount = adjustments.filter((a) => a.workerId === deleteConfirmId).length;
        const linkedPaymentsCount = payments.filter((p) => p.workerId === deleteConfirmId).length;
        const hasLinkedData = linkedRecordsCount > 0 || linkedAdjustmentsCount > 0 || linkedPaymentsCount > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl">
              <div className="flex items-center gap-3 text-rose-600 mb-4 pb-3 border-b border-slate-100">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">تأیید حذف کارگر</h3>
                  <p className="text-xs text-slate-500 mt-0.5">آیا از حذف این کارگر مطمئن هستید؟</p>
                </div>
              </div>

              {/* Worker summary chip */}
              {targetWorker && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: targetWorker.avatarColor || '#2563eb' }}
                    >
                      {targetWorker.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{targetWorker.fullName}</div>
                      <div className="text-xs text-slate-500">{targetWorker.role || 'کارگر کارگاه'}</div>
                    </div>
                  </div>
                  <div className="text-left font-mono text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600">
                    کد: {toPersianDigits(targetWorker.code)}
                  </div>
                </div>
              )}

              {/* Linked data warnings */}
              {hasLinkedData ? (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2 mb-6 leading-relaxed">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>هشدار تأثیر بر سوابق کاری و مالی:</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    این کارگر دارای سوابق ثبت‌شده در سیستم است:
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-white/80 p-2 rounded-lg text-center border border-amber-200/60">
                      <div className="text-slate-500 text-[10px]">کارکرد روزانه</div>
                      <div className="font-bold text-xs text-amber-900 font-mono mt-0.5">
                        {toPersianDigits(linkedRecordsCount)} روز
                      </div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg text-center border border-amber-200/60">
                      <div className="text-slate-500 text-[10px]">پاداش و جریمه</div>
                      <div className="font-bold text-xs text-amber-900 font-mono mt-0.5">
                        {toPersianDigits(linkedAdjustmentsCount)} مورد
                      </div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg text-center border border-amber-200/60">
                      <div className="text-slate-500 text-[10px]">پرداخت‌های نقدی</div>
                      <div className="font-bold text-xs text-amber-900 font-mono mt-0.5">
                        {toPersianDigits(linkedPaymentsCount)} سند
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 pt-1">
                    با تأیید شما، کارگر و کلیه سوابق کاری و مالی فوق برای حفظ یکپارچگی پایگاه داده حذف خواهند شد.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  این کارگر هیچ سابقه کارکرد یا پرداختی ثبت‌شده‌ای ندارد و با حذف آن، تنها پرونده کارگر از سیستم برداشته می‌شود.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteWorker(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>بله، کارگر حذف شود</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
