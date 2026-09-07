import React, { useState, useMemo } from 'react';
import {
  Worker,
  Payment,
  PaymentMethod,
  AppSettings,
} from '../types';
import {
  toPersianDigits,
  formatCurrency,
  getCurrentJalaliDate,
  JALALI_MONTH_NAMES,
} from '../utils/jalali';
import {
  WalletCards,
  Plus,
  Search,
  Filter,
  Trash2,
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
} from 'lucide-react';

interface PaymentsViewProps {
  workers: Worker[];
  payments: Payment[];
  settings: AppSettings;
  onSavePayment: (payment: Payment) => void;
  onDeletePayment: (id: string) => void;
  isAddPaymentOpen: boolean;
  setIsAddPaymentOpen: (open: boolean) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  workers,
  payments,
  settings,
  onSavePayment,
  onDeletePayment,
  isAddPaymentOpen,
  setIsAddPaymentOpen,
}) => {
  const currentDate = getCurrentJalaliDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('all');

  // Form State
  const [formWorkerId, setFormWorkerId] = useState(workers[0]?.id || '');
  const [formAmount, setFormAmount] = useState<number | ''>(2500000);
  const [formDate, setFormDate] = useState(currentDate.formatted);
  const [formMethod, setFormMethod] = useState<PaymentMethod>('bank_transfer');
  const [formTracking, setFormTracking] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Receipt Modal State
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const workerMap = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);

  const handleOpenAdd = () => {
    setFormWorkerId(workers[0]?.id || '');
    setFormAmount(2500000);
    setFormDate(currentDate.formatted);
    setFormMethod('bank_transfer');
    setFormTracking('');
    setFormNotes('تسویه دستمزد');
    setFormError('');
    setIsAddPaymentOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWorkerId) {
      setFormError('لطفاً کارگر مورد نظر را انتخاب کنید.');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('مبلغ پرداختی باید بیشتر از صفر باشد.');
      return;
    }
    if (!formDate) {
      setFormError('تاریخ پرداخت الزامی است.');
      return;
    }

    const [y, m] = formDate.split(/[\/\-]/).map(Number);

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      workerId: formWorkerId,
      jalaliDate: formDate,
      year: y || currentDate.year,
      month: m || currentDate.month,
      amount: Number(formAmount),
      method: formMethod,
      trackingNumber: formTracking.trim(),
      notes: formNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePayment(payment);
    setIsAddPaymentOpen(false);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (selectedWorkerFilter !== 'all' && p.workerId !== selectedWorkerFilter) return false;
      if (selectedMethodFilter !== 'all' && p.method !== selectedMethodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const w = workerMap.get(p.workerId);
        const matchName = w?.fullName.toLowerCase().includes(q) || false;
        const matchTracking = p.trackingNumber?.toLowerCase().includes(q) || false;
        const matchNotes = p.notes?.toLowerCase().includes(q) || false;
        const matchDate = p.jalaliDate.includes(q);
        if (!matchName && !matchTracking && !matchNotes && !matchDate) return false;
      }
      return true;
    }).sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));
  }, [payments, selectedWorkerFilter, selectedMethodFilter, searchQuery, workerMap]);

  const totalFilteredAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <WalletCards className="w-5 h-5" />
            </span>
            <h2 className="text-lg md:text-xl font-bold text-slate-800">مدیریت پرداخت‌ها و تسویه‌حساب</h2>
          </div>
          <p className="text-xs text-slate-500">
            ثبت واریز دستمزد، مساعده‌ها، حواله‌ها و صدور رسید پرداخت رسمی
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت پرداخت جدید</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">مجموع کل پرداختی‌های فیلترشده</div>
          <div className="text-2xl font-bold text-blue-600 font-mono">
            {formatCurrency(totalFilteredAmount, settings.currencyUnit)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">تعداد کل تراکنش‌های ثبت‌شده</div>
          <div className="text-2xl font-bold text-slate-800 font-mono">
            {toPersianDigits(filteredPayments.length)}{' '}
            <span className="text-xs text-slate-500 font-normal">فقره</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium mb-1">میانگین هر پرداخت</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {formatCurrency(
              filteredPayments.length > 0 ? totalFilteredAmount / filteredPayments.length : 0,
              settings.currencyUnit
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm text-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو با نام کارگر، شماره پیگیری، تاریخ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 text-xs pr-9 pl-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>کارگر:</span>
          </div>
          <select
            value={selectedWorkerFilter}
            onChange={(e) => setSelectedWorkerFilter(e.target.value)}
            aria-label="فیلتر کارگر در پرداخت‌ها"
            className="bg-white text-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">همه کارگران</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.fullName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-slate-500 mr-2 font-medium">
            <span>روش پرداخت:</span>
          </div>
          <select
            value={selectedMethodFilter}
            onChange={(e) => setSelectedMethodFilter(e.target.value)}
            aria-label="فیلتر روش پرداخت"
            className="bg-white text-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">همه روش‌ها</option>
            <option value="bank_transfer">واریز بانکی</option>
            <option value="card_to_card">کارت به کارت</option>
            <option value="paya_satna">پایا / ساتنا</option>
            <option value="cash">نقدی</option>
            <option value="check">چک</option>
            <option value="other">سایر</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">کارگر دریافت‌کننده</th>
                <th className="py-3 px-4">تاریخ پرداخت</th>
                <th className="py-3 px-4 text-center">مبلغ پرداختی</th>
                <th className="py-3 px-4 text-center">روش پرداخت</th>
                <th className="py-3 px-4 text-center">شماره پیگیری / ارجاع</th>
                <th className="py-3 px-4">توضیحات و بابت</th>
                <th className="py-3 px-4 text-center">عملیات / رسید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    هیچ پرداختی با این فیلترها ثبت نشده است.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => {
                  const worker = workerMap.get(pay.workerId);
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                            style={{ backgroundColor: worker?.avatarColor || '#3b82f6' }}
                          >
                            {worker?.fullName.slice(0, 2) || '؟'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {worker?.fullName || 'کارگر حذف شده'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              کد: {worker?.code || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 font-semibold">
                        {toPersianDigits(pay.jalaliDate)}
                      </td>

                      <td className="py-3 px-4 text-center font-bold font-mono text-blue-600 text-xs">
                        {formatCurrency(pay.amount, settings.currencyUnit)}
                      </td>

                      <td className="py-3 px-4 text-center text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-medium">
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
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {pay.trackingNumber || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {pay.notes || '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setReceiptPayment(pay)}
                            title="چاپ رسید پرداخت"
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 p-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          <button
                            onClick={() => onDeletePayment(pay.id)}
                            title="حذف پرداخت"
                            className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <WalletCards className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">ثبت پرداخت جدید دستمزد</h3>
              </div>
              <button
                onClick={() => setIsAddPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  انتخاب کارگر دریافت‌کننده <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formWorkerId}
                  onChange={(e) => setFormWorkerId(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName} (کد: {w.code} - {w.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    مبلغ پرداختی ({settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'}) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatCurrency(Number(formAmount) || 0, settings.currencyUnit)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاریخ پرداخت (شمسی) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="1403/06/15"
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    روش پرداخت
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شماره پیگیری / ارجاع بانکی
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: TRX-992140"
                    value={formTracking}
                    onChange={(e) => setFormTracking(e.target.value)}
                    className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  توضیحات و بابت
                </label>
                <input
                  type="text"
                  placeholder="مثال: تسویه حقوق نیمه اول ماه یا مساعده"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  ثبت نهایی پرداخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl print:bg-white print:text-black">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:border-black mb-4 print:hidden">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>رسید پرداخت وجه</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ</span>
                </button>
                <button
                  onClick={() => setReceiptPayment(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-slate-200 print:border-black">
                <div className="font-bold text-sm text-slate-900 print:text-black">
                  {settings.workshopName}
                </div>
                <div className="text-slate-500 print:text-slate-600 text-[11px] mt-0.5">
                  رسید واریز دستمزد به پرسنل
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">نام و نام خانوادگی:</span>
                  <span className="font-bold text-slate-800 print:text-black">
                    {workerMap.get(receiptPayment.workerId)?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">کد پرسنلی:</span>
                  <span className="font-mono text-slate-700 print:text-black">
                    {workerMap.get(receiptPayment.workerId)?.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">تاریخ پرداخت:</span>
                  <span className="font-mono text-slate-700 print:text-black">
                    {toPersianDigits(receiptPayment.jalaliDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">روش پرداخت:</span>
                  <span className="text-slate-700 print:text-black">
                    {receiptPayment.method === 'bank_transfer'
                      ? 'واریز بانکی'
                      : receiptPayment.method === 'card_to_card'
                      ? 'کارت به کارت'
                      : 'نقدی / سایر'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">شماره پیگیری:</span>
                  <span className="font-mono text-slate-700 print:text-black">
                    {receiptPayment.trackingNumber || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-slate-600">بابت:</span>
                  <span className="text-slate-700 print:text-black">
                    {receiptPayment.notes || '-'}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 print:border-black flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-700 print:text-black">مبلغ پرداختی:</span>
                  <span className="text-blue-600 print:text-black font-mono">
                    {formatCurrency(receiptPayment.amount, settings.currencyUnit)}
                  </span>
                </div>
              </div>

              <div className="pt-6 flex justify-between text-[11px] text-slate-500 print:text-black border-t border-dashed border-slate-300 print:border-black mt-4">
                <div>امضای دریافت‌کننده</div>
                <div>مهر و امضای مدیریت کارگاه</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
