import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  WorkerPayrollSummary,
  AppSettings,
} from '../types';
import { isJalaliDateInRange } from './jalali';

export function calculateWorkerPayroll(
  worker: Worker,
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  filterOptions?: { year?: number; month?: number; startDate?: string; endDate?: string }
): WorkerPayrollSummary {
  // Filter records by date/month if specified
  const filteredRecords = workRecords.filter((record) => {
    if (record.workerId !== worker.id) return false;
    if (filterOptions?.startDate || filterOptions?.endDate) {
      if (!isJalaliDateInRange(record.jalaliDate, filterOptions.startDate, filterOptions.endDate)) {
        return false;
      }
    } else {
      if (filterOptions?.year && record.year !== filterOptions.year) return false;
      if (filterOptions?.month && record.month !== filterOptions.month) return false;
    }
    return true;
  });

  const filteredAdjustments = adjustments.filter((adj) => {
    if (adj.workerId !== worker.id) return false;
    if (filterOptions?.startDate || filterOptions?.endDate) {
      if (!isJalaliDateInRange(adj.jalaliDate, filterOptions.startDate, filterOptions.endDate)) {
        return false;
      }
    } else {
      if (filterOptions?.year && adj.year !== filterOptions.year) return false;
      if (filterOptions?.month && adj.month !== filterOptions.month) return false;
    }
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    if (p.workerId !== worker.id) return false;
    if (filterOptions?.startDate || filterOptions?.endDate) {
      if (!isJalaliDateInRange(p.jalaliDate, filterOptions.startDate, filterOptions.endDate)) {
        return false;
      }
    } else {
      if (filterOptions?.year && p.year !== filterOptions.year) return false;
      if (filterOptions?.month && p.month !== filterOptions.month) return false;
    }
    return true;
  });

  let fullDaysCount = 0;
  let halfDaysCount = 0;
  let absentDaysCount = 0;
  let leaveDaysCount = 0;
  let missionDaysCount = 0;
  let totalWorkedHours = 0;
  let totalOvertimeHours = 0;

  filteredRecords.forEach((rec) => {
    totalWorkedHours += rec.workedHours || 0;
    totalOvertimeHours += rec.overtimeHours || 0;

    switch (rec.status) {
      case 'full':
        fullDaysCount++;
        break;
      case 'half':
        halfDaysCount++;
        break;
      case 'absent':
        absentDaysCount++;
        break;
      case 'leave':
        leaveDaysCount++;
        break;
      case 'mission':
        missionDaysCount++;
        break;
    }
  });

  const workedDaysCount = fullDaysCount + halfDaysCount + missionDaysCount;
  const standardHours = settings.defaultDailyHours || 8;
  const overtimeMult = worker.overtimeRateMultiplier || settings.defaultOvertimeMultiplier || 1.4;

  let baseSalary = 0;
  let overtimeSalary = 0;

  if (worker.wageType === 'hourly') {
    // Hourly: worked normal hours * hourly rate + overtime hours * overtime hourly rate
    const regularHours = Math.max(0, totalWorkedHours - totalOvertimeHours);
    baseSalary = regularHours * worker.baseRate;
    const overtimeRate = worker.baseRate * overtimeMult;
    overtimeSalary = totalOvertimeHours * overtimeRate;
  } else if (worker.wageType === 'daily') {
    // Daily: baseRate is per day. Hourly equivalent = baseRate / standardHours
    const hourlyEquivalent = worker.baseRate / standardHours;
    const regularHours = Math.max(0, totalWorkedHours - totalOvertimeHours);
    baseSalary = regularHours * hourlyEquivalent;
    const overtimeRate = hourlyEquivalent * overtimeMult;
    overtimeSalary = totalOvertimeHours * overtimeRate;
  } else if (worker.wageType === 'monthly') {
    // Monthly: standard 26-day working month equivalent (approx 208 hours)
    const monthlyWorkingDays = 26;
    const monthlyStandardHours = monthlyWorkingDays * standardHours;
    const hourlyEquivalent = worker.baseRate / monthlyStandardHours;
    
    // If full attendance recorded or based on recorded worked hours
    const regularHours = Math.max(0, totalWorkedHours - totalOvertimeHours);
    baseSalary = regularHours * hourlyEquivalent;
    const overtimeRate = hourlyEquivalent * overtimeMult;
    overtimeSalary = totalOvertimeHours * overtimeRate;
  }

  // Adjustments (Bonuses, Fines, Advances, Custom titles)
  let totalAdditions = 0;
  let totalDeductions = 0;

  filteredAdjustments.forEach((adj) => {
    if (adj.category === 'addition') {
      totalAdditions += adj.amount || 0;
    } else {
      totalDeductions += adj.amount || 0;
    }
  });

  const grossSalary = Math.round(baseSalary + overtimeSalary + totalAdditions);
  const netSalary = Math.round(grossSalary - totalDeductions);

  // Total Paid
  const totalPaid = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingBalance = netSalary - totalPaid;

  return {
    worker,
    workedDaysCount,
    fullDaysCount,
    halfDaysCount,
    absentDaysCount,
    leaveDaysCount,
    missionDaysCount,
    totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
    totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
    baseSalary: Math.round(baseSalary),
    overtimeSalary: Math.round(overtimeSalary),
    totalAdditions: Math.round(totalAdditions),
    totalDeductions: Math.round(totalDeductions),
    grossSalary,
    netSalary,
    totalPaid: Math.round(totalPaid),
    remainingBalance: Math.round(remainingBalance),
  };
}

export interface DailyWageBreakdown {
  workedHours: number;
  overtimeHours: number;
  regularHours: number;
  baseWage: number;
  overtimeWage: number;
  additions: number; // Bonuses, allowances for that day
  deductions: number; // Penalties, fines, deductions for that day
  grossWage: number; // baseWage + overtimeWage + additions
  netWage: number; // grossWage - deductions
}

/**
 * Calculates the exact daily net wage breakdown for a worker on a single day.
 * Formula: حقوق خالص روزانه = حقوق پایه کارکرد + دستمزد اضافه کاری + پاداش/مزایا - جریمه/کسورات
 */
export function calculateDailyWageBreakdown(
  worker: Worker,
  record: WorkRecord | undefined,
  dayAdjustments: FinancialAdjustment[] = [],
  settings: AppSettings
): DailyWageBreakdown {
  const standardHours = settings.defaultDailyHours || 8;
  const overtimeMult = worker.overtimeRateMultiplier || settings.defaultOvertimeMultiplier || 1.4;

  const workedHours = record ? (record.workedHours || 0) : 0;
  const overtimeHours = record ? (record.overtimeHours || 0) : 0;
  const regularHours = Math.max(0, workedHours - overtimeHours);

  let baseWage = 0;
  let overtimeWage = 0;

  if (worker.wageType === 'hourly') {
    baseWage = regularHours * worker.baseRate;
    const overtimeRate = worker.baseRate * overtimeMult;
    overtimeWage = overtimeHours * overtimeRate;
  } else if (worker.wageType === 'daily') {
    const hourlyEquivalent = worker.baseRate / standardHours;
    baseWage = regularHours * hourlyEquivalent;
    const overtimeRate = hourlyEquivalent * overtimeMult;
    overtimeWage = overtimeHours * overtimeRate;
  } else if (worker.wageType === 'monthly') {
    const monthlyWorkingDays = 26;
    const monthlyStandardHours = monthlyWorkingDays * standardHours;
    const hourlyEquivalent = worker.baseRate / monthlyStandardHours;
    baseWage = regularHours * hourlyEquivalent;
    const overtimeRate = hourlyEquivalent * overtimeMult;
    overtimeWage = overtimeHours * overtimeRate;
  }

  let additions = 0;
  let deductions = 0;

  dayAdjustments.forEach((adj) => {
    if (adj.category === 'addition') {
      additions += adj.amount || 0;
    } else {
      deductions += adj.amount || 0;
    }
  });

  const grossWage = Math.round(baseWage + overtimeWage + additions);
  const netWage = Math.round(grossWage - deductions);

  return {
    workedHours,
    overtimeHours,
    regularHours,
    baseWage: Math.round(baseWage),
    overtimeWage: Math.round(overtimeWage),
    additions: Math.round(additions),
    deductions: Math.round(deductions),
    grossWage,
    netWage,
  };
}

export function calculateAllWorkersPayroll(
  workers: Worker[],
  workRecords: WorkRecord[],
  adjustments: FinancialAdjustment[],
  payments: Payment[],
  settings: AppSettings,
  filterOptions?: { year?: number; month?: number; startDate?: string; endDate?: string }
): WorkerPayrollSummary[] {
  return workers.map((worker) =>
    calculateWorkerPayroll(worker, workRecords, adjustments, payments, settings, filterOptions)
  );
}
