import React from 'react';
import { Worker, WorkerPayrollSummary, AppSettings } from '../types';
import {
  toPersianDigits,
  formatCurrency,
  formatHours,
  JALALI_MONTH_NAMES,
} from '../utils/jalali';
import { Printer, X, Building2, CheckCircle2 } from 'lucide-react';

interface PayslipModalProps {
  worker: Worker;
  summary: WorkerPayrollSummary;
  settings: AppSettings;
  year: number;
  month: number;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  worker,
  summary,
  settings,
  year,
  month,
  onClose,
}) => {
  const monthName = JALALI_MONTH_NAMES[month - 1] || `${month}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Action Top Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>پیش‌نمایش و چاپ فیش حقوقی رسمی ({monthName} {toPersianDigits(year)})</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / ذخیره PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 print:bg-white print:text-black print:p-0">
          <div
            id="official-payslip"
            className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-6 print:border print:border-black print:bg-white print:rounded-none print:shadow-none shadow-sm text-slate-800 print:text-black"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-200 print:border-black pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 print:bg-slate-200 text-white print:text-black flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-black print:text-black text-slate-800">
                      {settings.workshopName || 'کارگاه فنی و صنعتی پیشرو'}
                    </h1>
                    <p className="text-xs text-slate-500 print:text-slate-600">
                      مدیریت: {settings.managerName || 'مدیریت کارگاه'}
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-base font-black text-blue-600 print:text-black">
                    فیش حقوق و دستمزد
                  </div>
                  <div className="text-xs text-slate-500 print:text-slate-700 mt-0.5">
                    دوره: {monthName} ماه سال {toPersianDigits(year)}
                  </div>
                </div>
              </div>
            </div>

            {/* Worker Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 print:bg-slate-100 p-3.5 rounded-lg border border-slate-200 print:border-slate-300 text-xs mb-4">
              <div>
                <span className="text-slate-500 print:text-slate-600 block">نام و نام خانوادگی:</span>
                <span className="font-bold text-slate-800 print:text-black">{worker.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">کد پرسنلی:</span>
                <span className="font-mono font-bold text-slate-800 print:text-black">{worker.code}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">کد ملی:</span>
                <span className="font-mono text-slate-800 print:text-black">{toPersianDigits(worker.nationalId || '-')}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">شغل / سمت:</span>
                <span className="text-slate-800 print:text-black">{worker.role}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">نوع دستمزد:</span>
                <span className="text-slate-800 print:text-black">
                  {worker.wageType === 'daily'
                    ? 'روزمزد'
                    : worker.wageType === 'hourly'
                    ? 'ساعتی'
                    : 'ماهانه'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">نرخ پایه دستمزد:</span>
                <span className="font-bold text-slate-800 print:text-black">
                  {formatCurrency(worker.baseRate, settings.currencyUnit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">کارکرد موظف / حضور:</span>
                <span className="font-bold text-indigo-600 print:text-black">
                  {formatHours(summary.totalWorkedHours)} ({toPersianDigits(summary.workedDaysCount)} روز)
                </span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">ساعات اضافه کاری:</span>
                <span className="font-bold text-emerald-600 print:text-black">
                  {formatHours(summary.totalOvertimeHours)}
                </span>
              </div>
            </div>

            {/* Financial Details Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Additions / Earnings */}
              <div className="border border-slate-200 print:border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-emerald-50 print:bg-slate-200 px-3.5 py-2 text-xs font-bold text-emerald-700 print:text-black border-b border-slate-200 print:border-slate-300">
                  مزایا و دریافتی‌ها (افزایشی)
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 print:text-black">حقوق پایه کارکرد:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(summary.baseSalary, settings.currencyUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 print:text-black">دستمزد اضافه کاری:</span>
                    <span className="font-mono font-bold text-emerald-600 print:text-black">
                      +{formatCurrency(summary.overtimeSalary, settings.currencyUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 print:text-black">پاداش‌ها و سایر مزایا:</span>
                    <span className="font-mono font-bold text-emerald-600 print:text-black">
                      +{formatCurrency(summary.totalAdditions, settings.currencyUnit)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 print:border-slate-300 flex justify-between font-bold text-slate-800 print:text-black">
                    <span>جمع کل ناخالص:</span>
                    <span className="font-mono">
                      {formatCurrency(summary.grossSalary, settings.currencyUnit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-200 print:border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-rose-50 print:bg-slate-200 px-3.5 py-2 text-xs font-bold text-rose-700 print:text-black border-b border-slate-200 print:border-slate-300">
                  کسورات و جریمه‌ها (کاهشی)
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 print:text-black">جریمه، تأخیر و خسارت:</span>
                    <span className="font-mono text-rose-600 print:text-black">
                      -{formatCurrency(summary.totalDeductions, settings.currencyUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 print:text-black">مساعده‌ها و علی‌الحساب:</span>
                    <span className="font-mono text-slate-500 print:text-slate-600">منظور در کسورات</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 print:border-slate-300 flex justify-between font-bold text-rose-600 print:text-black">
                    <span>جمع کل کسورات:</span>
                    <span className="font-mono">
                      -{formatCurrency(summary.totalDeductions, settings.currencyUnit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Summary Ribbon */}
            <div className="bg-slate-50 print:bg-slate-100 p-4 rounded-lg border border-slate-200 print:border-slate-400 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[11px] text-slate-500 print:text-slate-600">حقوق خالص نهایی</div>
                  <div className="text-base font-black text-slate-800 print:text-black mt-0.5">
                    {formatCurrency(summary.netSalary, settings.currencyUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 print:text-slate-600">مجموع پرداختی‌های ثبت‌شده</div>
                  <div className="text-base font-black text-blue-600 print:text-black mt-0.5">
                    {formatCurrency(summary.totalPaid, settings.currencyUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 print:text-slate-600">مانده قابل پرداخت (طلب کارگر)</div>
                  <div className="text-base font-black text-amber-600 print:text-black mt-0.5">
                    {formatCurrency(summary.remainingBalance, settings.currencyUnit)}
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures & Stamps */}
            <div className="pt-4 border-t border-slate-200 print:border-black flex justify-between items-end text-xs text-slate-500 print:text-black">
              <div className="text-center w-40">
                <div className="mb-8">امضای کارگر</div>
                <div className="border-b border-dashed border-slate-300 print:border-black w-full"></div>
              </div>
              <div className="text-center w-40">
                <div className="mb-8">مهر و امضای امور مالی / مدیریت</div>
                <div className="border-b border-dashed border-slate-300 print:border-black w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
