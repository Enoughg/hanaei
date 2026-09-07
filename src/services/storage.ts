import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  AdjustmentPreset,
  Payment,
  AppSettings,
} from '../types';
import { getCurrentJalaliDate, getDaysInJalaliMonth } from '../utils/jalali';

const STORAGE_KEYS = {
  WORKERS: 'kargah_app_workers_v1',
  RECORDS: 'kargah_app_records_v1',
  ADJUSTMENTS: 'kargah_app_adjustments_v1',
  PAYMENTS: 'kargah_app_payments_v1',
  SETTINGS: 'kargah_app_settings_v1',
  PRESETS: 'kargah_app_presets_v1',
  SELECTED_PERIOD: 'kargah_app_selected_period_v1',
  AUTH_SESSION: 'kargah_app_auth_session_v1',
};

export const DEFAULT_JOB_ROLES: string[] = [
  'جوشکار ارشد',
  'جوشکار CO2 و آرگون',
  'تراشکار و فرزکار CNC',
  'کارگر فنی و مونتاژکار',
  'برق‌کار صنعتی و تابلو',
  'انباردار و مسئول تدارکات',
  'سرپرست کارگاه و تولید',
  'کارگر ساده',
  'اپراتور خط تولید و دستگاه',
  'راننده و خدمات کارگاه',
  'نقشه‌کش و طراح صنعتی',
  'کنترل کیفیت (QC)',
];

export const DEFAULT_SETTINGS: AppSettings = {
  workshopName: 'کارگاه فنی و صنعتی پیشرو',
  managerName: 'مهندس رضایی',
  currencyUnit: 'toman',
  defaultDailyHours: 8,
  defaultBreakMinutes: 60,
  defaultOvertimeMultiplier: 1.4,
  overtimeMultiplier: 1.4,
  workStartHour: '07:30',
  workEndHour: '16:30',
  jobRoles: DEFAULT_JOB_ROLES,
  defaultYear: undefined,
  defaultMonth: undefined,
  authConfig: {
    isEnabled: true,
    username: 'admin',
    password: '123',
    displayName: 'مدیر کارگاه',
  },
};

export const DEFAULT_ADJUSTMENT_PRESETS: AdjustmentPreset[] = [
  // کسورات
  {
    id: 'preset-ded-1',
    title: 'ناهار',
    category: 'deduction',
    type: 'deduction',
    defaultAmount: 50000,
    isActive: true,
    notes: 'هزینه ناهار روزانه',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-ded-2',
    title: 'جریمه تأخیر',
    category: 'deduction',
    type: 'penalty',
    defaultAmount: 100000,
    isActive: true,
    notes: 'کسر بابت تاخیر در ورود',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-ded-3',
    title: 'جریمه غیبت',
    category: 'deduction',
    type: 'penalty',
    defaultAmount: 200000,
    isActive: true,
    notes: 'کسر بابت غیبت غیرموجه',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-ded-4',
    title: 'مساعده',
    category: 'deduction',
    type: 'advance',
    defaultAmount: 500000,
    isActive: true,
    notes: 'مساعده و علی‌الحساب دریافتی',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-ded-5',
    title: 'پیش‌پرداخت',
    category: 'deduction',
    type: 'advance',
    defaultAmount: 1000000,
    isActive: true,
    notes: 'پیش‌پرداخت یا تسویه موقت',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-ded-6',
    title: 'کسری کار',
    category: 'deduction',
    type: 'deduction',
    defaultAmount: 50000,
    isActive: true,
    notes: 'کسر بابت عدم تکمیل ساعات کار موظف',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // تشویقی‌ها و پاداش‌ها
  {
    id: 'preset-add-1',
    title: 'پاداش',
    category: 'addition',
    type: 'bonus',
    defaultAmount: 100000,
    isActive: true,
    notes: 'پاداش عمومی کارگاهی',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-add-2',
    title: 'پاداش عملکرد',
    category: 'addition',
    type: 'bonus',
    defaultAmount: 200000,
    isActive: true,
    notes: 'پاداش کیفیت و سرعت بالای عملکرد',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-add-3',
    title: 'پاداش اضافه کاری',
    category: 'addition',
    type: 'bonus',
    defaultAmount: 150000,
    isActive: true,
    notes: 'تشویقی بابت شیفت اضافه و شرایط سخت کاری',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-add-4',
    title: 'پاداش ویژه',
    category: 'addition',
    type: 'bonus',
    defaultAmount: 300000,
    isActive: true,
    notes: 'پاداش ویژه پروژه‌ای',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-add-5',
    title: 'کمک هزینه ایاب و ذهاب',
    category: 'addition',
    type: 'commute_cost',
    defaultAmount: 50000,
    isActive: true,
    notes: 'هزینه تردد یا سرویس رفت‌وآمد',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

export function getInitialSeedData(): {
  workers: Worker[];
  workRecords: WorkRecord[];
  adjustments: FinancialAdjustment[];
  payments: Payment[];
  settings: AppSettings;
} {
  const { year, month } = getCurrentJalaliDate();
  const daysCount = getDaysInJalaliMonth(year, month);

  const workers: Worker[] = [
    {
      id: 'w-1',
      code: '101',
      fullName: 'رضا حسینی',
      nationalId: '0071234567',
      phone: '09121112233',
      role: 'سرپرست کارگاه و جوشکار ارشد',
      contractType: 'تمام وقت',
      wageType: 'daily',
      baseRate: 750000, // 750,000 toman / day
      overtimeRateMultiplier: 1.4,
      startDate: '1402/01/15',
      isActive: true,
      notes: 'تسلط کامل به نقشه‌خوانی و جوش CO2',
      accountNumber: '6037991823456789',
      cardNumber: '6037991823456789',
      shabaNumber: 'IR120170000000101234567890',
      accountOwner: 'رضا حسینی',
      avatarColor: '#2563eb',
    },
    {
      id: 'w-2',
      code: '102',
      fullName: 'علی محمدی',
      nationalId: '0089876543',
      phone: '09122223344',
      role: 'تراشکار و فرزکار CNC',
      contractType: 'تمام وقت',
      wageType: 'hourly',
      baseRate: 95000, // 95,000 toman / hour
      overtimeRateMultiplier: 1.5,
      startDate: '1402/03/01',
      isActive: true,
      notes: 'دقت بالا در قطعه‌سازی دقیق',
      accountNumber: '5892101234567890',
      cardNumber: '5892101234567890',
      shabaNumber: 'IR890150000000201234567890',
      accountOwner: 'علی محمدی',
      avatarColor: '#10b981',
    },
    {
      id: 'w-3',
      code: '103',
      fullName: 'مجید رضایی',
      nationalId: '0451122334',
      phone: '09123334455',
      role: 'مونتاژکار و تکنسین فنی',
      contractType: 'تمام وقت',
      wageType: 'monthly',
      baseRate: 18500000, // 18,500,000 toman / month
      overtimeRateMultiplier: 1.4,
      startDate: '1402/06/10',
      isActive: true,
      notes: 'مسئول خط مونتاژ نهایی',
      accountNumber: '6274121198765432',
      cardNumber: '6274121198765432',
      shabaNumber: 'IR540620000000301234567890',
      accountOwner: 'مجید رضایی',
      avatarColor: '#8b5cf6',
    },
    {
      id: 'w-4',
      code: '104',
      fullName: 'سارا احمدی',
      nationalId: '0015566778',
      phone: '09124445566',
      role: 'کنترل کیفیت (QC)',
      contractType: 'تمام وقت',
      wageType: 'daily',
      baseRate: 680000,
      overtimeRateMultiplier: 1.4,
      startDate: '1402/08/01',
      isActive: true,
      notes: 'ثبت و پایش آزمون‌های ابعادی',
      accountNumber: '5022291033445566',
      cardNumber: '5022291033445566',
      shabaNumber: 'IR670560000000401234567890',
      accountOwner: 'سارا احمدی',
      avatarColor: '#ec4899',
    },
    {
      id: 'w-5',
      code: '105',
      fullName: 'امیر کریمی',
      nationalId: '0069988776',
      phone: '09125556677',
      role: 'کارگر فنی و انباردار',
      contractType: 'روزمزد',
      wageType: 'daily',
      baseRate: 550000,
      overtimeRateMultiplier: 1.3,
      startDate: '1403/02/01',
      isActive: false,
      notes: 'پایان قرارداد موقت در ماه قبل',
      accountNumber: '6104337812345678',
      cardNumber: '6104337812345678',
      shabaNumber: 'IR330120000000501234567890',
      accountOwner: 'امیر کریمی',
      avatarColor: '#f59e0b',
    },
  ];

  const workRecords: WorkRecord[] = [];
  const adjustments: FinancialAdjustment[] = [];

  // Seed attendance for current month (up to day 20 or min days)
  const activeWorkers = workers.filter((w) => w.isActive);
  const sampleLimitDays = Math.min(22, daysCount);

  activeWorkers.forEach((worker, wIndex) => {
    for (let day = 1; day <= sampleLimitDays; day++) {
      // simulate Friday off (every 7th day roughly or modulo)
      const isFriday = day % 7 === 6; // simulate weekend
      if (isFriday) {
        workRecords.push({
          id: `rec-${worker.id}-${day}`,
          workerId: worker.id,
          jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
          year,
          month,
          day,
          entryTime: '',
          exitTime: '',
          breakDurationMinutes: 0,
          workedHours: 0,
          overtimeHours: 0,
          status: 'holiday',
          notes: 'تعطیل هفتگی',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      // Worker 1 has some overtime
      let entryTime = '07:30';
      let exitTime = '16:30';
      let breakM = 60;
      let workedH = 8;
      let otH = 0;
      let status: WorkRecord['status'] = 'full';
      let notes = '';

      if (wIndex === 0 && (day === 4 || day === 12 || day === 18)) {
        exitTime = '18:30';
        workedH = 10;
        otH = 2;
        notes = 'اضافه کاری سفارش فوری';
      } else if (wIndex === 1 && day === 8) {
        entryTime = '07:30';
        exitTime = '11:30';
        breakM = 0;
        workedH = 4;
        status = 'half';
        notes = 'مرخصی ساعتی بعدازظهر';
      } else if (wIndex === 2 && day === 15) {
        status = 'leave';
        entryTime = '';
        exitTime = '';
        breakM = 0;
        workedH = 0;
        notes = 'مرخصی استحقاقی';
      }

      workRecords.push({
        id: `rec-${worker.id}-${day}`,
        workerId: worker.id,
        jalaliDate: `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
        year,
        month,
        day,
        entryTime,
        exitTime,
        breakDurationMinutes: breakM,
        workedHours: workedH,
        overtimeHours: otH,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  // Add realistic adjustments
  adjustments.push(
    {
      id: 'adj-1',
      workerId: 'w-1',
      workRecordId: `rec-w-1-4`,
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/04`,
      year,
      month,
      day: 4,
      title: 'پاداش کیفیت و تسریع پروژه',
      type: 'bonus',
      category: 'addition',
      amount: 500000,
      notes: 'به دلیل جوشکاری بی‌نقص شاسی دستگاه',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'adj-2',
      workerId: 'w-1',
      workRecordId: `rec-w-1-10`,
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/10`,
      year,
      month,
      day: 10,
      title: 'مساعده نیمه ماه',
      type: 'advance',
      category: 'deduction',
      amount: 2000000,
      notes: 'واریز نقدی بنا به درخواست کارگر',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'adj-3',
      workerId: 'w-2',
      workRecordId: `rec-w-2-5`,
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/05`,
      year,
      month,
      day: 5,
      title: 'کمک هزینه ایاب و ذهاب',
      type: 'commute_cost',
      category: 'addition',
      amount: 400000,
      notes: 'ماموریت خارج از کارگاه',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'adj-4',
      workerId: 'w-2',
      workRecordId: `rec-w-2-9`,
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/09`,
      year,
      month,
      day: 9,
      title: 'جریمه تاخیر و خسارت ابزار',
      type: 'penalty',
      category: 'deduction',
      amount: 250000,
      notes: 'شکستن مته الماسه به علت عدم رعایت دور استاندارد',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'adj-5',
      workerId: 'w-3',
      workRecordId: `rec-w-3-12`,
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/12`,
      year,
      month,
      day: 12,
      title: 'پاداش نوآوری در خط تولید',
      type: 'custom',
      category: 'addition',
      amount: 800000,
      notes: 'طراحی جیگ و فیکسچر بهینه برای افزایش سرعت مونتاژ',
      createdAt: new Date().toISOString(),
    }
  );

  const payments: Payment[] = [
    {
      id: 'pay-1',
      workerId: 'w-1',
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/15`,
      year,
      month,
      amount: 4000000,
      method: 'bank_transfer',
      trackingNumber: 'TRX-982143',
      notes: 'علی‌الحساب حقوق نیمه اول ماه',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pay-2',
      workerId: 'w-2',
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/15`,
      year,
      month,
      amount: 3500000,
      method: 'card_to_card',
      trackingNumber: 'CARD-441209',
      notes: 'پرداخت بخش اول دستمزد',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pay-3',
      workerId: 'w-3',
      jalaliDate: `${year}/${String(month).padStart(2, '0')}/15`,
      year,
      month,
      amount: 6000000,
      method: 'paya_satna',
      trackingNumber: 'PAYA-773190',
      notes: 'مساعده ثابت ماهانه',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    workers,
    workRecords,
    adjustments,
    payments,
    settings: DEFAULT_SETTINGS,
  };
}

export function loadAppData(): {
  workers: Worker[];
  workRecords: WorkRecord[];
  adjustments: FinancialAdjustment[];
  payments: Payment[];
  settings: AppSettings;
  presets: AdjustmentPreset[];
} {
  try {
    const rawWorkers = localStorage.getItem(STORAGE_KEYS.WORKERS);
    const rawRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
    const rawAdjustments = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    const rawPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const rawPresets = localStorage.getItem(STORAGE_KEYS.PRESETS);

    if (!rawWorkers) {
      // First time initialization with seed data
      const seed = getInitialSeedData();
      saveAppData(seed.workers, seed.workRecords, seed.adjustments, seed.payments, seed.settings, DEFAULT_ADJUSTMENT_PRESETS);
      return {
        ...seed,
        presets: DEFAULT_ADJUSTMENT_PRESETS,
      };
    }

    let loadedSettings: AppSettings = rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : { ...DEFAULT_SETTINGS };
    if (!loadedSettings.jobRoles || loadedSettings.jobRoles.length === 0) {
      loadedSettings.jobRoles = DEFAULT_JOB_ROLES;
    }
    if (!loadedSettings.authConfig) {
      loadedSettings.authConfig = DEFAULT_SETTINGS.authConfig;
    }
    if (!loadedSettings.workStartHour || loadedSettings.workStartHour === '08:00') {
      loadedSettings.workStartHour = '07:30';
    }
    if (!loadedSettings.workEndHour || loadedSettings.workEndHour === '17:00' || loadedSettings.workEndHour === '16:00') {
      loadedSettings.workEndHour = '16:30';
    }

    let loadedRecords: WorkRecord[] = rawRecords ? JSON.parse(rawRecords) : [];
    let recordsModified = false;
    loadedRecords = loadedRecords.map((r) => {
      let rUpdated = { ...r };
      if (r.entryTime === '08:00') {
        rUpdated.entryTime = '07:30';
        recordsModified = true;
      }
      if (r.exitTime === '17:00' || r.exitTime === '16:00') {
        rUpdated.exitTime = '16:30';
        recordsModified = true;
      }
      return rUpdated;
    });

    if (rawSettings && (loadedSettings.workStartHour !== JSON.parse(rawSettings).workStartHour || loadedSettings.workEndHour !== JSON.parse(rawSettings).workEndHour)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(loadedSettings));
    }
    if (recordsModified) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(loadedRecords));
    }

    return {
      workers: rawWorkers ? JSON.parse(rawWorkers) : [],
      workRecords: loadedRecords,
      adjustments: rawAdjustments ? JSON.parse(rawAdjustments) : [],
      payments: rawPayments ? JSON.parse(rawPayments) : [],
      settings: loadedSettings,
      presets: rawPresets ? JSON.parse(rawPresets) : DEFAULT_ADJUSTMENT_PRESETS,
    };
  } catch (error) {
    console.error('Error loading app data from storage:', error);
    const seed = getInitialSeedData();
    return {
      ...seed,
      presets: DEFAULT_ADJUSTMENT_PRESETS,
    };
  }
}

export function saveAppData(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  presets?: AdjustmentPreset[]
) {
  try {
    localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(workers));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(workRecords));
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    if (presets) {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
    }
  } catch (error) {
    console.error('Error saving app data to storage:', error);
  }
}

export function loadWorkers(): Worker[] {
  return loadAppData().workers;
}

export function saveWorkers(workers: Worker[]) {
  const data = loadAppData();
  saveAppData(workers, data.workRecords, data.adjustments, data.payments, data.settings, data.presets);
}

export function loadWorkRecords(): WorkRecord[] {
  return loadAppData().workRecords;
}

export function saveWorkRecords(records: WorkRecord[]) {
  const data = loadAppData();
  saveAppData(data.workers, records, data.adjustments, data.payments, data.settings, data.presets);
}

export function loadAdjustments(): FinancialAdjustment[] {
  return loadAppData().adjustments;
}

export function saveAdjustments(adjustments: FinancialAdjustment[]) {
  const data = loadAppData();
  saveAppData(data.workers, data.workRecords, adjustments, data.payments, data.settings, data.presets);
}

export function loadPayments(): Payment[] {
  return loadAppData().payments;
}

export function savePayments(payments: Payment[]) {
  const data = loadAppData();
  saveAppData(data.workers, data.workRecords, data.adjustments, payments, data.settings, data.presets);
}

export function loadSettings(): AppSettings {
  return loadAppData().settings;
}

export function saveSettings(settings: AppSettings) {
  const data = loadAppData();
  saveAppData(data.workers, data.workRecords, data.adjustments, data.payments, settings, data.presets);
}

export function loadAdjustmentPresets(): AdjustmentPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Initialize with default presets if not stored
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(DEFAULT_ADJUSTMENT_PRESETS));
    return DEFAULT_ADJUSTMENT_PRESETS;
  } catch (e) {
    return DEFAULT_ADJUSTMENT_PRESETS;
  }
}

export function saveAdjustmentPresets(presets: AdjustmentPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  } catch (e) {
    console.error('Error saving adjustment presets:', e);
  }
}

export function exportBackupJSON(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  presets?: AdjustmentPreset[]
): string {
  const data = {
    appName: 'سامانه مدیریت کارگاه',
    version: '1.1',
    exportDate: new Date().toISOString(),
    workers,
    workRecords,
    adjustments,
    payments,
    settings,
    presets: presets || loadAdjustmentPresets(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupJSON(jsonString: string): {
  success: boolean;
  message: string;
  data?: {
    workers: Worker[];
    workRecords: WorkRecord[];
    adjustments: FinancialAdjustment[];
    payments: Payment[];
    settings: AppSettings;
    presets?: AdjustmentPreset[];
  };
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed.workers) || !Array.isArray(parsed.workRecords)) {
      return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است.' };
    }
    return {
      success: true,
      message: 'پشتیبان با موفقیت بازیابی شد.',
      data: {
        workers: parsed.workers,
        workRecords: parsed.workRecords || [],
        adjustments: parsed.adjustments || [],
        payments: parsed.payments || [],
        settings: parsed.settings || DEFAULT_SETTINGS,
        presets: Array.isArray(parsed.presets) ? parsed.presets : DEFAULT_ADJUSTMENT_PRESETS,
      },
    };
  } catch (e) {
    return { success: false, message: 'خطا در خواندن فایل JSON.' };
  }
}

export function exportAllDataAsJSON() {
  const data = loadAppData();
  const jsonStr = exportBackupJSON(
    data.workers,
    data.workRecords,
    data.adjustments,
    data.payments,
    data.settings,
    data.presets
  );
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kargah-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllDataFromJSON(jsonString: string): boolean {
  const res = importBackupJSON(jsonString);
  if (res.success && res.data) {
    saveAppData(
      res.data.workers,
      res.data.workRecords,
      res.data.adjustments,
      res.data.payments,
      res.data.settings,
      res.data.presets
    );
    return true;
  }
  return false;
}

export function resetToSampleData() {
  const seed = getInitialSeedData();
  saveAppData(seed.workers, seed.workRecords, seed.adjustments, seed.payments, seed.settings, DEFAULT_ADJUSTMENT_PRESETS);
}

export function loadSavedPeriod(defaultYear?: number, defaultMonth?: number): { year: number; month: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELECTED_PERIOD);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.year === 'number' && typeof parsed.month === 'number') {
        return { year: parsed.year, month: parsed.month };
      }
    }
  } catch (e) {
    // fallback
  }
  const current = getCurrentJalaliDate();
  return {
    year: defaultYear && defaultYear >= 1400 ? defaultYear : current.year,
    month: defaultMonth && defaultMonth >= 1 && defaultMonth <= 12 ? defaultMonth : current.month,
  };
}

export function saveSavedPeriod(year: number, month: number) {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PERIOD, JSON.stringify({ year, month }));
  } catch (e) {
    console.error('Error saving selected period:', e);
  }
}

export function loadAuthSession(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    return raw === 'true';
  } catch (e) {
    return false;
  }
}

export function saveAuthSession(isAuthenticated: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, isAuthenticated ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving auth session:', e);
  }
}

export function isUserAuthenticated(authConfig?: any): boolean {
  if (!authConfig || !authConfig.isEnabled) return true;
  return loadAuthSession();
}

export function setUserAuthenticated(isAuthenticated: boolean) {
  saveAuthSession(isAuthenticated);
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  } catch (e) {
    console.error('Error clearing auth session:', e);
  }
}

export function clearAllData() {
  saveAppData([], [], [], [], DEFAULT_SETTINGS, DEFAULT_ADJUSTMENT_PRESETS);
}
