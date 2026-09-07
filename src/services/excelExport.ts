import * as XLSX from 'xlsx';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  AppSettings,
} from '../types';
import { calculateWorkerPayroll, calculateDailyWageBreakdown } from '../utils/payroll';
import {
  JALALI_MONTH_NAMES,
  getJalaliWeekdayName,
  normalizeJalaliDate,
  isJalaliDateInRange,
  formatCurrency,
  toPersianDigits,
} from '../utils/jalali';

function setRTL(ws: XLSX.WorkSheet) {
  if (!ws['!views']) {
    ws['!views'] = [];
  }
  ws['!views'].push({ RTL: true });
}

function autoFitColumns(ws: XLSX.WorkSheet, data: any[][]) {
  if (!data || data.length === 0) return;
  const colCount = Math.max(...data.map((row) => row.length));
  const colWidths: { wch: number }[] = [];

  for (let colIndex = 0; colIndex < colCount; colIndex++) {
    let maxLen = 10;
    data.forEach((row) => {
      const val = row[colIndex];
      if (val !== undefined && val !== null) {
        const str = String(val);
        // Persian characters + general spacing factor
        maxLen = Math.max(maxLen, str.length + 4);
      }
    });
    colWidths.push({ wch: Math.min(Math.max(maxLen, 12), 45) });
  }
  ws['!cols'] = colWidths;
}

export interface RangeExportOptions {
  startDate: string; // e.g. "1405/05/10"
  endDate: string;   // e.g. "1405/05/20"
  documentNumber?: string; // e.g. "1405-0520-01"
  documentDate?: string;   // e.g. "1405/05/20"
  selectedWorkerIds?: string[];
  payableBasis?: 'net_balance' | 'net_salary'; // 'net_balance' = netSalary - totalPaid in range, 'net_salary' = netSalary
  reportTitle?: string;
}

/**
 * =========================================================================
 * 1. Reference Payment Excel Export (قالب مرجع واریزی بانکی و حسابداری)
 * Exactly matches the required column structure:
 * ردیف | لیست افراد واریزی | عنوان شغلی | کد ملی | شماره سند | مبلغ | شماره کارت | شبا | شماره تماس | صاحب حساب
 * =========================================================================
 */
export function exportReferencePaymentExcel(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  options: RangeExportOptions
) {
  const normStart = normalizeJalaliDate(options.startDate);
  const normEnd = normalizeJalaliDate(options.endDate);
  const docNumber = options.documentNumber?.trim() || `SANAD-${normEnd.replace(/\//g, '')}`;
  const docDate = options.documentDate?.trim() || normEnd;

  const targetWorkers = options.selectedWorkerIds && options.selectedWorkerIds.length > 0
    ? workers.filter((w) => options.selectedWorkerIds!.includes(w.id))
    : workers.filter((w) => w.isActive || true); // Include all matching

  // Top Title & Header Metadata
  const rows: any[][] = [];

  // Metadata block
  rows.push([
    'گزارش واریزی پرسنل (قالب مرجع حسابداری و بانک)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  rows.push([
    `کارگاه: ${settings.workshopName || 'کارگاه فنی'}`,
    '',
    `مدیر: ${settings.managerName || '-'}`,
    '',
    `شماره سند: ${docNumber}`,
    '',
    `تاریخ سند: ${docDate}`,
    '',
    `واحد پولی: ${settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'}`,
    '',
  ]);
  rows.push([
    'بازه محاسباتی:',
    `از ${normStart}`,
    `تا ${normEnd}`,
    '',
    `تعداد نفرات: ${targetWorkers.length} نفر`,
    '',
    '',
    '',
    '',
    '',
  ]);
  rows.push([]); // Empty spacer row

  // Table Columns strictly matching requirement:
  // ردیف | لیست افراد واریزی | عنوان شغلی | کد ملی | شماره سند | مبلغ | شماره کارت | شبا | شماره تماس | صاحب حساب
  const tableHeader = [
    'ردیف',
    'لیست افراد واریزی',
    'عنوان شغلی',
    'کد ملی',
    'شماره سند',
    `مبلغ (${settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'})`,
    'شماره کارت',
    'شبا',
    'شماره تماس',
    'صاحب حساب',
  ];
  rows.push(tableHeader);

  let rowIndex = 1;
  let totalAmount = 0;

  targetWorkers.forEach((worker) => {
    const summary = calculateWorkerPayroll(worker, workRecords, adjustments, payments, settings, {
      startDate: normStart,
      endDate: normEnd,
    });

    const payableAmount = options.payableBasis === 'net_salary'
      ? summary.netSalary
      : summary.remainingBalance;

    totalAmount += payableAmount;

    // Preserve strings as text for numbers with leading zeros (card, shaba, nationalId, phone)
    const card = worker.cardNumber || worker.accountNumber || '';
    const shaba = worker.shabaNumber || '';
    const nationalId = worker.nationalId || '';
    const phone = worker.phone || '';
    const accountOwner = worker.accountOwner?.trim() || worker.fullName;

    rows.push([
      rowIndex++,
      worker.fullName,
      worker.role || '-',
      nationalId ? nationalId : '',
      docNumber,
      payableAmount,
      card ? card : '',
      shaba ? shaba : '',
      phone ? phone : '',
      accountOwner,
    ]);
  });

  // Summary row at the bottom
  rows.push([
    'جمع کل',
    `${targetWorkers.length} نفر`,
    '',
    '',
    '',
    totalAmount,
    '',
    '',
    '',
    '',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Mark text columns explicitly so Excel doesn't strip leading zeros or convert to scientific notation
  const startDataRow = 5; // row index 0-based
  for (let r = startDataRow; r < startDataRow + targetWorkers.length; r++) {
    // Column D (index 3): کد ملی
    const cellD = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[cellD]) {
      ws[cellD].t = 's';
      ws[cellD].v = String(ws[cellD].v);
    }
    // Column E (index 4): شماره سند
    const cellE = XLSX.utils.encode_cell({ r, c: 4 });
    if (ws[cellE]) {
      ws[cellE].t = 's';
      ws[cellE].v = String(ws[cellE].v);
    }
    // Column F (index 5): مبلغ (Number)
    const cellF = XLSX.utils.encode_cell({ r, c: 5 });
    if (ws[cellF]) {
      ws[cellF].t = 'n';
      ws[cellF].z = '#,##0';
    }
    // Column G (index 6): شماره کارت
    const cellG = XLSX.utils.encode_cell({ r, c: 6 });
    if (ws[cellG]) {
      ws[cellG].t = 's';
      ws[cellG].v = String(ws[cellG].v);
    }
    // Column H (index 7): شماره شبا
    const cellH = XLSX.utils.encode_cell({ r, c: 7 });
    if (ws[cellH]) {
      ws[cellH].t = 's';
      ws[cellH].v = String(ws[cellH].v);
    }
    // Column I (index 8): شماره تماس
    const cellI = XLSX.utils.encode_cell({ r, c: 8 });
    if (ws[cellI]) {
      ws[cellI].t = 's';
      ws[cellI].v = String(ws[cellI].v);
    }
    // Column J (index 9): صاحب حساب
    const cellJ = XLSX.utils.encode_cell({ r, c: 9 });
    if (ws[cellJ]) {
      ws[cellJ].t = 's';
      ws[cellJ].v = String(ws[cellJ].v);
    }
  }

  // Format Total cell
  const totalCell = XLSX.utils.encode_cell({ r: startDataRow + targetWorkers.length, c: 5 });
  if (ws[totalCell]) {
    ws[totalCell].t = 'n';
    ws[totalCell].z = '#,##0';
  }

  setRTL(ws);
  autoFitColumns(ws, rows);

  // Column specific width overrides for readability
  ws['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 24 }, // لیست افراد واریزی
    { wch: 22 }, // عنوان شغلی
    { wch: 16 }, // کد ملی
    { wch: 18 }, // شماره سند
    { wch: 20 }, // مبلغ
    { wch: 22 }, // شماره کارت
    { wch: 28 }, // شبا
    { wch: 16 }, // شماره تماس
    { wch: 24 }, // صاحب حساب
  ];

  const sheetTitle = `واریزی ${normStart.replace(/\//g, '-')}_${normEnd.replace(/\//g, '-')}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));

  const fileName = `لیست_واریزی_${normStart.replace(/\//g, '')}_تا_${normEnd.replace(/\//g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * =========================================================================
 * 2. Comprehensive Custom Range Payroll Excel Export (گزارش جامع حقوق و دستمزد)
 * =========================================================================
 */
export function exportCustomRangePayrollExcel(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  options: RangeExportOptions
) {
  const normStart = normalizeJalaliDate(options.startDate);
  const normEnd = normalizeJalaliDate(options.endDate);

  const targetWorkers = options.selectedWorkerIds && options.selectedWorkerIds.length > 0
    ? workers.filter((w) => options.selectedWorkerIds!.includes(w.id))
    : workers;

  const header = [
    'ردیف',
    'کد کارگر',
    'نام و نام خانوادگی',
    'شغل / سمت',
    'نوع دستمزد',
    'نرخ پایه',
    'روزهای کارکرد',
    'مجموع ساعات کار',
    'ساعات اضافه کاری',
    'حقوق پایه کارکرد',
    'مبلغ اضافه کاری',
    'مجموع پاداش و مزایا',
    'مجموع جریمه و کسورات',
    'حقوق ناخالص',
    'حقوق خالص استحقاقی',
    'واریزی‌های این بازه',
    'مانده قابل تسویه',
  ];

  const rows: any[][] = [];
  rows.push([`گزارش جامع حقوق و دستمزد کارگاه (${settings.workshopName})`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push([`بازه زمانی: از ${normStart} تا ${normEnd}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push([]);
  rows.push(header);

  let rowIndex = 1;
  let totalGrossAll = 0;
  let totalNetAll = 0;
  let totalPaidAll = 0;
  let totalBalanceAll = 0;
  let totalHoursAll = 0;
  let totalOvertimeAll = 0;

  targetWorkers.forEach((worker) => {
    const summary = calculateWorkerPayroll(worker, workRecords, adjustments, payments, settings, {
      startDate: normStart,
      endDate: normEnd,
    });

    totalGrossAll += summary.grossSalary;
    totalNetAll += summary.netSalary;
    totalPaidAll += summary.totalPaid;
    totalBalanceAll += summary.remainingBalance;
    totalHoursAll += summary.totalWorkedHours;
    totalOvertimeAll += summary.totalOvertimeHours;

    let wageTypeStr = 'روزانه';
    if (worker.wageType === 'hourly') wageTypeStr = 'ساعتی';
    if (worker.wageType === 'monthly') wageTypeStr = 'ماهانه';

    rows.push([
      rowIndex++,
      worker.code,
      worker.fullName,
      worker.role,
      wageTypeStr,
      worker.baseRate,
      summary.workedDaysCount,
      summary.totalWorkedHours,
      summary.totalOvertimeHours,
      summary.baseSalary,
      summary.overtimeSalary,
      summary.totalAdditions,
      summary.totalDeductions,
      summary.grossSalary,
      summary.netSalary,
      summary.totalPaid,
      summary.remainingBalance,
    ]);
  });

  // Summary row at bottom
  rows.push([
    'جمع کل',
    '',
    `${targetWorkers.length} نفر`,
    '',
    '',
    '',
    '',
    totalHoursAll,
    totalOvertimeAll,
    '',
    '',
    '',
    '',
    totalGrossAll,
    totalNetAll,
    totalPaidAll,
    totalBalanceAll,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setRTL(ws);
  autoFitColumns(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, 'حقوق و دستمزد');
  XLSX.writeFile(wb, `گزارش_حقوق_دستمزد_${normStart.replace(/\//g, '')}_تا_${normEnd.replace(/\//g, '')}.xlsx`);
}

/**
 * =========================================================================
 * 3. Daily Attendance Excel Export for Custom Date Range (ریز کارکرد روزانه)
 * =========================================================================
 */
export function exportCustomRangeAttendanceExcel(
  workers: Worker[],
  workRecords: WorkRecord[],
  options: RangeExportOptions
) {
  const normStart = normalizeJalaliDate(options.startDate);
  const normEnd = normalizeJalaliDate(options.endDate);

  const targetWorkers = options.selectedWorkerIds && options.selectedWorkerIds.length > 0
    ? workers.filter((w) => options.selectedWorkerIds!.includes(w.id))
    : workers;

  const header = [
    'ردیف',
    'کد کارگر',
    'نام و نام خانوادگی',
    'شغل / سمت',
    'تاریخ (شمسی)',
    'روز هفته',
    'ساعت ورود',
    'ساعت خروج',
    'استراحت (دقیقه)',
    'ساعات کارکرد',
    'اضافه کاری (ساعت)',
    'وضعیت حضور',
    'توضیحات و یادداشت',
  ];

  const rows: any[][] = [];
  rows.push([`ریز کارکرد و حضور و غیاب پرسنل`, '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push([`بازه زمانی: از ${normStart} تا ${normEnd}`, '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push([]);
  rows.push(header);

  let rowIndex = 1;
  let sumWorked = 0;
  let sumOt = 0;

  targetWorkers.forEach((worker) => {
    const workerRecords = workRecords
      .filter((r) => r.workerId === worker.id && isJalaliDateInRange(r.jalaliDate, normStart, normEnd))
      .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));

    workerRecords.forEach((record) => {
      const weekday = getJalaliWeekdayName(record.year, record.month, record.day);
      let statusText = 'نامشخص';
      switch (record.status) {
        case 'full':
          statusText = 'کارکرد کامل';
          break;
        case 'half':
          statusText = 'نیمه‌وقت';
          break;
        case 'absent':
          statusText = 'غیبت';
          break;
        case 'leave':
          statusText = 'مرخصی';
          break;
        case 'holiday':
          statusText = 'تعطیل';
          break;
        case 'mission':
          statusText = 'مأموریت';
          break;
        case 'other':
          statusText = 'سایر';
          break;
      }

      sumWorked += record.workedHours || 0;
      sumOt += record.overtimeHours || 0;

      rows.push([
        rowIndex++,
        worker.code,
        worker.fullName,
        worker.role || '-',
        record.jalaliDate,
        weekday,
        record.entryTime || '-',
        record.exitTime || '-',
        record.breakDurationMinutes || 0,
        record.workedHours || 0,
        record.overtimeHours || 0,
        statusText,
        record.notes || '',
      ]);
    });
  });

  rows.push([
    'مجموع',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Math.round(sumWorked * 10) / 10,
    Math.round(sumOt * 10) / 10,
    '',
    '',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setRTL(ws);
  autoFitColumns(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, 'ریز تردد و کارکرد');
  XLSX.writeFile(wb, `گزارش_تردد_کارکرد_${normStart.replace(/\//g, '')}_تا_${normEnd.replace(/\//g, '')}.xlsx`);
}

/**
 * =========================================================================
 * 4. Multi-Sheet Complete Package Workbook Export (پکیج جامع کلیه شیت‌ها)
 * =========================================================================
 */
export function exportFullCustomRangeWorkbookExcel(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  options: RangeExportOptions
) {
  const normStart = normalizeJalaliDate(options.startDate);
  const normEnd = normalizeJalaliDate(options.endDate);
  const docNumber = options.documentNumber?.trim() || `SANAD-${normEnd.replace(/\//g, '')}`;
  const docDate = options.documentDate?.trim() || normEnd;

  const targetWorkers = options.selectedWorkerIds && options.selectedWorkerIds.length > 0
    ? workers.filter((w) => options.selectedWorkerIds!.includes(w.id))
    : workers;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Reference Payment List (قالب مرجع واریزی)
  const payRows: any[][] = [];
  payRows.push(['لیست واریزی بانکی پرسنل (قالب مرجع)', '', '', '', '', '', '', '', '', '']);
  payRows.push([
    `کارگاه: ${settings.workshopName}`,
    '',
    `شماره سند: ${docNumber}`,
    '',
    `تاریخ سند: ${docDate}`,
    '',
    `بازه: از ${normStart} تا ${normEnd}`,
    '',
    '',
    '',
  ]);
  payRows.push([]);
  payRows.push([
    'ردیف',
    'لیست افراد واریزی',
    'عنوان شغلی',
    'کد ملی',
    'شماره سند',
    `مبلغ (${settings.currencyUnit === 'toman' ? 'تومان' : 'ریال'})`,
    'شماره کارت',
    'شبا',
    'شماره تماس',
    'صاحب حساب',
  ]);

  let totalPay = 0;
  targetWorkers.forEach((worker, idx) => {
    const summary = calculateWorkerPayroll(worker, workRecords, adjustments, payments, settings, {
      startDate: normStart,
      endDate: normEnd,
    });
    const amount = options.payableBasis === 'net_salary' ? summary.netSalary : summary.remainingBalance;
    totalPay += amount;

    payRows.push([
      idx + 1,
      worker.fullName,
      worker.role || '-',
      worker.nationalId || '',
      docNumber,
      amount,
      worker.cardNumber || worker.accountNumber || '',
      worker.shabaNumber || '',
      worker.phone || '',
      worker.accountOwner || worker.fullName,
    ]);
  });
  payRows.push(['جمع کل', `${targetWorkers.length} نفر`, '', '', '', totalPay, '', '', '', '']);

  const wsPay = XLSX.utils.aoa_to_sheet(payRows);
  setRTL(wsPay);
  autoFitColumns(wsPay, payRows);
  XLSX.utils.book_append_sheet(wb, wsPay, '۱- لیست واریزی (بانک)');

  // Sheet 2: Detailed Payroll Summary
  const sumRows: any[][] = [];
  sumRows.push(['خلاصه جامع محاسبات حقوق و دستمزد', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  sumRows.push([`بازه زمانی: از ${normStart} تا ${normEnd}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  sumRows.push([]);
  sumRows.push([
    'ردیف',
    'کد پرسنلی',
    'نام کارگر',
    'سمت',
    'نوع قرارداد',
    'کارکرد (روز)',
    'ساعات کار',
    'اضافه کاری',
    'حقوق پایه',
    'مبلغ اضافه کاری',
    'پاداش و مزایا',
    'کسورات و جریمه',
    'خالص حقوق',
    'پرداخت شده',
    'مانده طلب',
  ]);

  targetWorkers.forEach((worker, idx) => {
    const s = calculateWorkerPayroll(worker, workRecords, adjustments, payments, settings, {
      startDate: normStart,
      endDate: normEnd,
    });
    sumRows.push([
      idx + 1,
      worker.code,
      worker.fullName,
      worker.role,
      worker.contractType,
      s.workedDaysCount,
      s.totalWorkedHours,
      s.totalOvertimeHours,
      s.baseSalary,
      s.overtimeSalary,
      s.totalAdditions,
      s.totalDeductions,
      s.netSalary,
      s.totalPaid,
      s.remainingBalance,
    ]);
  });

  const wsSum = XLSX.utils.aoa_to_sheet(sumRows);
  setRTL(wsSum);
  autoFitColumns(wsSum, sumRows);
  XLSX.utils.book_append_sheet(wb, wsSum, '۲- خلاصه حقوق و دستمزد');

  // Sheet 3: Adjustments in Range
  const adjRows: any[][] = [];
  adjRows.push(['ریز پاداش‌ها، مزایا، جریمه‌ها و مساعده در بازه', '', '', '', '', '', '', '']);
  adjRows.push([`بازه: از ${normStart} تا ${normEnd}`, '', '', '', '', '', '', '']);
  adjRows.push([]);
  adjRows.push([
    'ردیف',
    'تاریخ',
    'کد کارگر',
    'نام کارگر',
    'عنوان تراکنش',
    'دسته‌بندی',
    'نوع',
    'مبلغ',
    'توضیحات',
  ]);

  const filteredAdjs = adjustments.filter(
    (a) =>
      isJalaliDateInRange(a.jalaliDate, normStart, normEnd) &&
      (!options.selectedWorkerIds || options.selectedWorkerIds.includes(a.workerId))
  );

  filteredAdjs.forEach((a, idx) => {
    const w = workers.find((wk) => wk.id === a.workerId);
    adjRows.push([
      idx + 1,
      a.jalaliDate,
      w?.code || '-',
      w?.fullName || 'کارگر',
      a.title,
      a.category === 'addition' ? 'پاداش / افزایشی' : 'کسورات / کاهشی',
      a.type,
      a.category === 'addition' ? a.amount : -a.amount,
      a.notes || '',
    ]);
  });

  const wsAdj = XLSX.utils.aoa_to_sheet(adjRows);
  setRTL(wsAdj);
  autoFitColumns(wsAdj, adjRows);
  XLSX.utils.book_append_sheet(wb, wsAdj, '۳- تعدیلات مالی و پاداش');

  // Sheet 4: Payments in Range
  const paymRows: any[][] = [];
  paymRows.push(['ریز واریزی‌ها و پرداخت‌های ثبت‌شده در بازه', '', '', '', '', '', '']);
  paymRows.push([`بازه: از ${normStart} تا ${normEnd}`, '', '', '', '', '', '']);
  paymRows.push([]);
  paymRows.push([
    'ردیف',
    'تاریخ پرداخت',
    'کد کارگر',
    'نام کارگر',
    'مبلغ پرداختی',
    'روش پرداخت',
    'شماره پیگیری',
    'توضیحات',
  ]);

  const filteredPays = payments.filter(
    (p) =>
      isJalaliDateInRange(p.jalaliDate, normStart, normEnd) &&
      (!options.selectedWorkerIds || options.selectedWorkerIds.includes(p.workerId))
  );

  filteredPays.forEach((p, idx) => {
    const w = workers.find((wk) => wk.id === p.workerId);
    paymRows.push([
      idx + 1,
      p.jalaliDate,
      w?.code || '-',
      w?.fullName || 'کارگر',
      p.amount,
      p.method,
      p.trackingNumber || '-',
      p.notes || '',
    ]);
  });

  const wsPaym = XLSX.utils.aoa_to_sheet(paymRows);
  setRTL(wsPaym);
  autoFitColumns(wsPaym, paymRows);
  XLSX.utils.book_append_sheet(wb, wsPaym, '۴- سوابق پرداخت‌ها');

  XLSX.writeFile(wb, `پکیج_جامع_مالی_${normStart.replace(/\//g, '')}_تا_${normEnd.replace(/\//g, '')}.xlsx`);
}

/**
 * =========================================================================
 * 5. Backwards-compatible legacy exports
 * =========================================================================
 */
export function exportMonthlyWorkRecordsExcel(
  workers: Worker[],
  workRecords: WorkRecord[],
  year: number,
  month: number,
  selectedWorkerIds?: string[]
) {
  const monthName = JALALI_MONTH_NAMES[month - 1] || `${month}`;
  const startDate = `${year}/${String(month).padStart(2, '0')}/01`;
  const endDate = `${year}/${String(month).padStart(2, '0')}/31`;
  exportCustomRangeAttendanceExcel(workers, workRecords, {
    startDate,
    endDate,
    selectedWorkerIds,
    reportTitle: `گزارش کارکرد ${monthName} ${year}`,
  });
}

export function exportPayrollSummaryExcel(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  year: number,
  month: number,
  selectedWorkerIds?: string[]
) {
  const startDate = `${year}/${String(month).padStart(2, '0')}/01`;
  const endDate = `${year}/${String(month).padStart(2, '0')}/31`;
  exportCustomRangePayrollExcel(workers, workRecords, adjustments, payments, settings, {
    startDate,
    endDate,
    selectedWorkerIds,
  });
}

export function exportSingleWorkerRangeExcel(
  worker: Worker,
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  filterOptions?: { startDate?: string; endDate?: string; year?: number; month?: number }
) {
  const normStart = filterOptions?.startDate ? normalizeJalaliDate(filterOptions.startDate) : '';
  const normEnd = filterOptions?.endDate ? normalizeJalaliDate(filterOptions.endDate) : '';

  const filteredRecords = workRecords
    .filter((r) => {
      if (r.workerId !== worker.id) return false;
      if (normStart || normEnd) {
        return isJalaliDateInRange(r.jalaliDate, normStart, normEnd);
      }
      if (filterOptions?.year && r.year !== filterOptions.year) return false;
      if (filterOptions?.month && r.month !== filterOptions.month) return false;
      return true;
    })
    .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));

  const filteredAdjustments = adjustments.filter((a) => {
    if (a.workerId !== worker.id) return false;
    if (normStart || normEnd) {
      return isJalaliDateInRange(a.jalaliDate, normStart, normEnd);
    }
    if (filterOptions?.year && a.year !== filterOptions.year) return false;
    if (filterOptions?.month && a.month !== filterOptions.month) return false;
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    if (p.workerId !== worker.id) return false;
    if (normStart || normEnd) {
      return isJalaliDateInRange(p.jalaliDate, normStart, normEnd);
    }
    if (filterOptions?.year && p.year !== filterOptions.year) return false;
    if (filterOptions?.month && p.month !== filterOptions.month) return false;
    return true;
  });

  const summary = calculateWorkerPayroll(worker, workRecords, adjustments, payments, settings, {
    startDate: normStart,
    endDate: normEnd,
    year: filterOptions?.year,
    month: filterOptions?.month,
  });

  const wb = XLSX.utils.book_new();
  const currencyLabel = settings.currencyUnit === 'toman' ? 'تومان' : 'ریال';

  // --- SHEET 1: Daily Work Records & Net Wage (ریز کارکرد روزانه و حقوق خالص) ---
  const sheet1Rows: any[][] = [];

  // Title & Metadata
  sheet1Rows.push([`گزارش کارکرد و حقوق خالص روزانه - ${worker.fullName}`, '', '', '', '', '', '', '', '', '', '', '', '']);
  sheet1Rows.push([
    `کارگاه: ${settings.workshopName || 'کارگاه فنی'}`,
    '',
    `کد پرسنلی: ${worker.code}`,
    '',
    `شغل: ${worker.role || '-'}`,
    '',
    `کد ملی: ${worker.nationalId || '-'}`,
    '',
    `شماره تماس: ${worker.phone || '-'}`,
    '',
    `نوع دستمزد: ${worker.wageType === 'daily' ? 'روزمزد' : worker.wageType === 'hourly' ? 'ساعتی' : 'ماهانه'}`,
    '',
    `نرخ پایه: ${worker.baseRate} ${currencyLabel}`,
  ]);

  if (normStart && normEnd) {
    sheet1Rows.push([
      `بازه زمانی انتخابی: از ${normStart} تا ${normEnd}`,
      '',
      `تعداد روزهای کارکرد: ${filteredRecords.length} روز`,
      '',
      `مجموع حقوق خالص دوره: ${summary.netSalary} ${currencyLabel}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  } else {
    sheet1Rows.push([`کل سوابق ثبت‌شده کارگر`, '', `تعداد روزها: ${filteredRecords.length}`, '', '', '', '', '', '', '', '', '', '']);
  }
  sheet1Rows.push([]); // Spacer row

  // Table Columns
  const tableHeader = [
    'ردیف',
    'نام کارگر',
    'تاریخ',
    'روز هفته',
    'ساعت ورود',
    'ساعت خروج',
    'میزان کارکرد (ساعت)',
    `حقوق پایه (${currencyLabel})`,
    `اضافه کاری / پاداش (${currencyLabel})`,
    `جریمه / کسورات (${currencyLabel})`,
    `حقوق خالص روزانه (${currencyLabel})`,
    'وضعیت حضور',
    'توضیحات و یادداشت',
  ];
  sheet1Rows.push(tableHeader);

  let sumWorkedHours = 0;
  let sumBaseWage = 0;
  let sumOvertimeAndBonus = 0;
  let sumDeductions = 0;
  let sumNetDailyWages = 0;

  filteredRecords.forEach((rec, idx) => {
    // Find adjustments attached to this date
    const dayAdjs = filteredAdjustments.filter(
      (a) => a.jalaliDate === rec.jalaliDate || (a.year === rec.year && a.month === rec.month && a.day === rec.day)
    );

    const wage = calculateDailyWageBreakdown(worker, rec, dayAdjs, settings);
    const overtimePlusAdditions = wage.overtimeWage + wage.additions;

    sumWorkedHours += wage.workedHours;
    sumBaseWage += wage.baseWage;
    sumOvertimeAndBonus += overtimePlusAdditions;
    sumDeductions += wage.deductions;
    sumNetDailyWages += wage.netWage;

    let statusText = 'کامل';
    switch (rec.status) {
      case 'full':
        statusText = 'کارکرد کامل';
        break;
      case 'half':
        statusText = 'نیمه‌وقت';
        break;
      case 'absent':
        statusText = 'غیبت';
        break;
      case 'leave':
        statusText = 'مرخصی';
        break;
      case 'holiday':
        statusText = 'تعطیل';
        break;
      case 'mission':
        statusText = 'مأموریت';
        break;
    }

    sheet1Rows.push([
      idx + 1,
      worker.fullName,
      rec.jalaliDate,
      getJalaliWeekdayName(rec.year, rec.month, rec.day),
      rec.entryTime || '-',
      rec.exitTime || '-',
      wage.workedHours,
      wage.baseWage,
      overtimePlusAdditions,
      wage.deductions,
      wage.netWage,
      statusText,
      rec.notes || '',
    ]);
  });

  // Requirement 4 & 5: Total Net Salary row at the bottom of the table
  sheet1Rows.push([
    'مجموع حقوق خالص بازه',
    worker.fullName,
    `${filteredRecords.length} روز کارکرد`,
    '',
    '',
    '',
    Math.round(sumWorkedHours * 10) / 10,
    sumBaseWage,
    sumOvertimeAndBonus,
    sumDeductions,
    sumNetDailyWages,
    '',
    `مجموع حقوق خالص بازه: ${sumNetDailyWages.toLocaleString('fa-IR')} ${currencyLabel}`,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
  setRTL(ws1);
  autoFitColumns(ws1, sheet1Rows);

  // Set column widths for sheet1
  ws1['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 22 }, // نام کارگر
    { wch: 14 }, // تاریخ
    { wch: 14 }, // روز هفته
    { wch: 12 }, // ساعت ورود
    { wch: 12 }, // ساعت خروج
    { wch: 18 }, // میزان کارکرد
    { wch: 18 }, // حقوق پایه
    { wch: 22 }, // اضافه کاری / پاداش
    { wch: 18 }, // جریمه / کسورات
    { wch: 22 }, // حقوق خالص روزانه
    { wch: 14 }, // وضعیت
    { wch: 30 }, // توضیحات
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'ریز کارکرد و حقوق روزانه');

  // --- SHEET 2: Financial Summary & Account Card (کارت حساب و خلاصه مالی) ---
  const summaryRows = [
    ['مشخصات و خلاصه پرونده مالی کارگر', worker.fullName],
    ['کد کارگر', worker.code],
    ['کد ملی', worker.nationalId || '-'],
    ['شماره تماس', worker.phone || '-'],
    ['شغل / سمت', worker.role || '-'],
    ['نوع همکاری', worker.contractType],
    ['نوع دستمزد', worker.wageType === 'daily' ? 'روزمزد' : worker.wageType === 'hourly' ? 'ساعتی' : 'ماهانه'],
    ['نرخ پایه دستمزد', worker.baseRate],
    ['شماره کارت', worker.cardNumber || worker.accountNumber || '-'],
    ['شماره شبا', worker.shabaNumber || '-'],
    ['نام صاحب حساب', worker.accountOwner || worker.fullName],
    ['بازه زمانی گزارش', normStart && normEnd ? `از ${normStart} تا ${normEnd}` : 'کل سوابق'],
    ['', ''],
    ['شاخص مالی دوره', `مقدار (${currencyLabel})`],
    ['تعداد روزهای کارکرد', summary.workedDaysCount],
    ['مجموع ساعات کارکرد', summary.totalWorkedHours],
    ['مجموع ساعات اضافه کاری', summary.totalOvertimeHours],
    ['حقوق پایه کارکرد', summary.baseSalary],
    ['دستمزد اضافه کاری', summary.overtimeSalary],
    ['مجموع پاداش و مزایا', summary.totalAdditions],
    ['مجموع جریمه و کسورات', summary.totalDeductions],
    ['حقوق ناخالص دوره', summary.grossSalary],
    ['حقوق خالص نهایی دوره', summary.netSalary],
    ['مجموع پرداختی‌های انجام‌شده در دوره', summary.totalPaid],
    ['مانده حساب قابل تسویه', summary.remainingBalance],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  setRTL(wsSummary);
  autoFitColumns(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'خلاصه حساب مالی');

  // --- SHEET 3: Adjustments in Range (پاداش‌ها و جریمه‌ها) ---
  if (filteredAdjustments.length > 0) {
    const adjRows: any[][] = [
      [`ریز پاداش‌ها، مزایا، جریمه‌ها و مساعده - ${worker.fullName}`, '', '', '', ''],
      ['ردیف', 'تاریخ', 'عنوان تراکنش', 'نوع تأثیر', `مبلغ (${currencyLabel})`, 'توضیحات'],
    ];

    filteredAdjustments.forEach((adj, i) => {
      adjRows.push([
        i + 1,
        adj.jalaliDate,
        adj.title,
        adj.category === 'addition' ? 'پاداش / افزایشی (+)' : 'جریمه / کسورات (-)',
        adj.amount,
        adj.notes || '',
      ]);
    });

    const wsAdj = XLSX.utils.aoa_to_sheet(adjRows);
    setRTL(wsAdj);
    autoFitColumns(wsAdj, adjRows);
    XLSX.utils.book_append_sheet(wb, wsAdj, 'پاداش و جریمه');
  }

  // --- SHEET 4: Payments in Range (سوابق واریزی) ---
  if (filteredPayments.length > 0) {
    const payRows: any[][] = [
      [`سوابق پرداخت‌ها و واریزی‌های ثبت‌شده - ${worker.fullName}`, '', '', '', ''],
      ['ردیف', 'تاریخ واریز', `مبلغ (${currencyLabel})`, 'روش پرداخت', 'شماره پیگیری / سند', 'توضیحات'],
    ];

    filteredPayments.forEach((p, i) => {
      payRows.push([
        i + 1,
        p.jalaliDate,
        p.amount,
        p.method === 'card_to_card'
          ? 'کارت به کارت'
          : p.method === 'bank_transfer'
          ? 'حواله بانکی'
          : p.method === 'paya_satna'
          ? 'پایا / ساتنا'
          : p.method === 'cash'
          ? 'نقدی'
          : p.method === 'check'
          ? 'چک'
          : 'سایر',
        p.trackingNumber || '-',
        p.notes || '',
      ]);
    });

    const wsPay = XLSX.utils.aoa_to_sheet(payRows);
    setRTL(wsPay);
    autoFitColumns(wsPay, payRows);
    XLSX.utils.book_append_sheet(wb, wsPay, 'سوابق پرداختی');
  }

  const rangeSuffix = normStart && normEnd ? `_${normStart.replace(/\//g, '')}_تا_${normEnd.replace(/\//g, '')}` : '';
  const fileName = `گزارش_کارکرد_${worker.fullName.replace(/\s+/g, '_')}${rangeSuffix}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportSingleWorkerDossierExcel(
  worker: Worker,
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  filterOptions?: { year?: number; month?: number; startDate?: string; endDate?: string }
) {
  exportSingleWorkerRangeExcel(worker, workRecords, adjustments, payments, settings, filterOptions);
}

export function exportAllWorkersExcel(workers: Worker[]) {
  const header = [
    'ردیف',
    'کد کارگر',
    'نام و نام خانوادگی',
    'کد ملی',
    'شماره تماس',
    'شغل / سمت',
    'نوع قرارداد',
    'نوع دستمزد',
    'نرخ پایه',
    'ضریب اضافه کاری',
    'تاریخ شروع همکاری',
    'وضعیت',
    'شماره کارت',
    'شماره شبا',
    'صاحب حساب',
    'توضیحات',
  ];

  const rows: any[][] = [header];
  workers.forEach((w, idx) => {
    rows.push([
      idx + 1,
      w.code,
      w.fullName,
      w.nationalId || '',
      w.phone || '',
      w.role || '',
      w.contractType,
      w.wageType === 'daily' ? 'روزمزد' : w.wageType === 'hourly' ? 'ساعتی' : 'ماهانه',
      w.baseRate,
      w.overtimeRateMultiplier,
      w.startDate,
      w.isActive ? 'فعال' : 'غیرفعال',
      w.cardNumber || w.accountNumber || '',
      w.shabaNumber || '',
      w.accountOwner || w.fullName,
      w.notes || '',
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setRTL(ws);
  autoFitColumns(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, 'لیست کارگران');
  XLSX.writeFile(wb, 'لیست_جامع_کارگران.xlsx');
}
