export type WageType = 'hourly' | 'daily' | 'monthly';

export type WorkStatus = 'full' | 'half' | 'absent' | 'leave' | 'holiday' | 'mission' | 'other';

export type FinancialAdjustmentType =
  | 'bonus'
  | 'penalty'
  | 'advance'
  | 'on_account'
  | 'overpayment'
  | 'deduction'
  | 'commute_cost'
  | 'allowance'
  | 'settlement'
  | 'custom';

export type AdjustmentCategory = 'addition' | 'deduction';

export type PaymentMethod =
  | 'cash'
  | 'card_to_card'
  | 'bank_transfer'
  | 'check'
  | 'paya_satna'
  | 'other';

export interface Worker {
  id: string;
  code: string; // Worker code e.g. "101"
  fullName: string;
  nationalId: string;
  phone: string;
  role: string; // e.g. "جوشکار", "تراشکار", "کارگر فنی"
  contractType: string; // e.g. "تمام وقت", "پاره وقت", "پیمانکاری", "روزمزد"
  wageType: WageType;
  baseRate: number; // e.g. 500,000 toman daily / 70,000 hourly / 15,000,000 monthly
  overtimeRateMultiplier: number; // e.g. 1.4
  startDate: string; // Jalali format: "1403/01/15"
  isActive: boolean;
  notes?: string;
  accountNumber?: string;
  cardNumber?: string;
  shabaNumber?: string;
  accountOwner?: string;
  avatarColor?: string;
}

export interface WorkRecord {
  id: string;
  workerId: string;
  jalaliDate: string; // "1403/06/01"
  year: number; // 1403
  month: number; // 6
  day: number; // 1
  entryTime: string; // "07:30"
  exitTime: string; // "16:30"
  breakDurationMinutes: number; // 60
  workedHours: number; // 8.0
  overtimeHours: number; // 1.0
  status: WorkStatus;
  notes?: string;
  updatedAt: string;
}

export interface FinancialAdjustment {
  id: string;
  workerId: string;
  workRecordId?: string; // Optional link to specific work record day
  jalaliDate: string; // "1403/06/01"
  year: number;
  month: number;
  day: number;
  title: string; // e.g. "پاداش کیفیت", "جریمه تاخیر", "کمک هزینه ایاب و ذهاب"
  type: FinancialAdjustmentType;
  category: AdjustmentCategory; // 'addition' (adds to salary) or 'deduction' (reduces salary)
  amount: number; // in current currency unit
  notes?: string;
  createdAt: string;
}

export interface AdjustmentPreset {
  id: string;
  title: string; // e.g. "ناهار", "جریمه تأخیر", "پاداش عملکرد", "مساعده"
  category: AdjustmentCategory; // 'addition' (تشویقی / پاداش) | 'deduction' (کسورات / جریمه)
  type: FinancialAdjustmentType;
  defaultAmount: number; // e.g. 50000
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  workerId: string;
  jalaliDate: string; // "1403/06/25"
  year: number;
  month: number;
  amount: number;
  method: PaymentMethod;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
}

export type CurrencyUnit = 'toman' | 'rial';

export interface AppUserAccount {
  username: string;
  password?: string;
  displayName?: string;
  isEnabled: boolean;
}

export interface AppSettings {
  workshopName: string;
  managerName: string;
  currencyUnit: CurrencyUnit;
  defaultDailyHours: number; // 8
  defaultBreakMinutes: number; // 60
  defaultOvertimeMultiplier: number; // 1.4
  overtimeMultiplier?: number;
  workStartHour: string; // "07:30"
  workEndHour: string; // "16:30"
  phone?: string;
  address?: string;
  jobRoles?: string[]; // Defined job titles/roles
  defaultYear?: number; // Default year for attendance e.g. 1405
  defaultMonth?: number; // Default month for attendance (1-12)
  authConfig?: AppUserAccount; // User authentication config
}

export interface WorkerPayrollSummary {
  worker: Worker;
  workedDaysCount: number;
  fullDaysCount: number;
  halfDaysCount: number;
  absentDaysCount: number;
  leaveDaysCount: number;
  missionDaysCount: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  baseSalary: number;
  overtimeSalary: number;
  totalAdditions: number; // Bonuses, commute, etc.
  totalDeductions: number; // Fines, advances, deductions
  grossSalary: number; // Base + Overtime + Additions
  netSalary: number; // Gross - Deductions
  totalPaid: number; // Payments made
  remainingBalance: number; // NetSalary - TotalPaid (positive means workshop owes worker)
}

export type ViewTab =
  | 'dashboard'
  | 'workers'
  | 'attendance'
  | 'payments'
  | 'reports'
  | 'excel'
  | 'settings';

export type ActiveTab = ViewTab;
