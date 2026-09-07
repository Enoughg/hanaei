/**
 * Jalali (Shamsi / Solar Hijri) date and formatting utilities.
 */

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Returns available Jalali years list supported across the entire system (from 1400 up to 1450).
 */
export function getAvailableJalaliYears(startYear = 1400, endYear = 1450): number[] {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  return years;
}

/**
 * Returns the number of days in a given Jalali month.
 * Months 1-6: 31 days
 * Months 7-11: 30 days
 * Month 12: 29 days (or 30 in leap years)
 */
export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  if (month === 12) {
    return isJalaliLeapYear(year) ? 30 : 29;
  }
  return 30;
}

export function isJalaliLeapYear(year: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jump = 0;
  if (year < jp || year >= breaks[breaks.length - 1]) return false;
  for (let i = 1; i < breaks.length; i++) {
    const jm = breaks[i];
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }
  let n = year - jp;
  if (jump - n < 6) n = n - jump + Math.floor((jump + 4) / 33) * 33;
  let leap = (n + 1) % 33;
  if (leap === 1 || leap === 5 || leap === 9 || leap === 13 || leap === 17 || leap === 22 || leap === 26 || leap === 30) {
    return true;
  }
  return false;
}

/**
 * Converts Gregorian date to Jalali
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

/**
 * Converts Jalali date to Gregorian
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd_m = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days >= gd_m[gm]) {
    days -= gd_m[gm];
    gm++;
  }
  return [gy, gm, days + 1];
}

/**
 * Gets current Jalali date
 */
export function getCurrentJalaliDate(): { year: number; month: number; day: number; formatted: string } {
  const now = new Date();
  const [year, month, day] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const formatted = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  return { year, month, day, formatted };
}

/**
 * Gets the Persian weekday index (0 = شنبه, 1 = یکشنبه, ..., 6 = جمعه) for a Jalali date
 */
export function getJalaliWeekdayIndex(year: number, month: number, day: number): number {
  const [gy, gm, gd] = jalaliToGregorian(year, month, day);
  const gDate = new Date(gy, gm - 1, gd);
  const gDay = gDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert to Saturday = 0
  const jDayIndex = (gDay + 1) % 7;
  return jDayIndex;
}

export function getJalaliWeekdayName(year: number, month: number, day: number): string {
  const idx = getJalaliWeekdayIndex(year, month, day);
  return JALALI_WEEKDAYS[idx];
}

export function formatJalaliDate(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

export function parseJalaliDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-]/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return null;
}

/**
 * Converts English digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

/**
 * Formats a currency amount with thousand separators and Persian numbers
 */
export function formatCurrency(amount: number, unit: 'toman' | 'rial' = 'toman', withUnit = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '۰';
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formattedNumber = absAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  const persianFormatted = toPersianDigits(formattedNumber);
  const sign = isNegative ? '-' : '';
  if (!withUnit) return `${sign}${persianFormatted}`;
  const unitStr = unit === 'toman' ? 'تومان' : 'ریال';
  return `${sign}${persianFormatted} ${unitStr}`;
}

/**
 * Formats hours with 1 decimal or round if whole
 */
export function formatHours(hours: number): string {
  if (hours === undefined || hours === null || isNaN(hours)) return '۰';
  const num = Math.round(hours * 10) / 10;
  const str = num % 1 === 0 ? num.toString() : num.toFixed(1);
  return toPersianDigits(str) + ' ساعت';
}

/**
 * Calculates worked hours and overtime from entry time, exit time and break duration
 * Format of times: "HH:mm" (e.g. "08:00", "17:30")
 */
export function calculateWorkedHours(
  entryTime: string,
  exitTime: string,
  breakMinutes = 60,
  standardDailyHours = 8
): { workedHours: number; overtimeHours: number } {
  if (!entryTime || !exitTime) return { workedHours: 0, overtimeHours: 0 };
  
  const [entryH, entryM] = entryTime.split(':').map((v) => parseInt(v, 10));
  const [exitH, exitM] = exitTime.split(':').map((v) => parseInt(v, 10));
  
  if (isNaN(entryH) || isNaN(entryM) || isNaN(exitH) || isNaN(exitM)) {
    return { workedHours: 0, overtimeHours: 0 };
  }

  let totalMinutes = (exitH * 60 + exitM) - (entryH * 60 + entryM) - (breakMinutes || 0);
  if (totalMinutes < 0) totalMinutes = 0;

  const workedHours = Math.round((totalMinutes / 60) * 100) / 100;
  const overtimeHours = workedHours > standardDailyHours ? Math.round((workedHours - standardDailyHours) * 100) / 100 : 0;

  return { workedHours, overtimeHours };
}

/**
 * Normalizes Jalali date string to "YYYY/MM/DD" format with zero-padded month and day.
 * Handles inputs like "1405/5/10", "1405-5-10", "1405/05/10".
 */
export function normalizeJalaliDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split(/[\/\-\.]/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const year = parts[0];
    const month = String(parts[1]).padStart(2, '0');
    const day = String(parts[2]).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
  return dateStr.trim();
}

/**
 * Validates whether a Jalali date string is a real valid date.
 */
export function isValidJalaliDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.trim().split(/[\/\-\.]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return false;
  const [year, month, day] = parts;
  if (year < 1300 || year > 1500) return false;
  if (month < 1 || month > 12) return false;
  const daysInMonth = getDaysInJalaliMonth(year, month);
  if (day < 1 || day > daysInMonth) return false;
  return true;
}

/**
 * Checks if a given Jalali date is within [startDate, endDate] inclusive.
 */
export function isJalaliDateInRange(dateStr: string, startDate?: string, endDate?: string): boolean {
  if (!dateStr) return false;
  const normDate = normalizeJalaliDate(dateStr);
  if (startDate) {
    const normStart = normalizeJalaliDate(startDate);
    if (normDate < normStart) return false;
  }
  if (endDate) {
    const normEnd = normalizeJalaliDate(endDate);
    if (normDate > normEnd) return false;
  }
  return true;
}

/**
 * Compares two Jalali dates (-1 if d1 < d2, 0 if d1 == d2, 1 if d1 > d2)
 */
export function compareJalaliDates(date1: string, date2: string): number {
  const n1 = normalizeJalaliDate(date1);
  const n2 = normalizeJalaliDate(date2);
  if (n1 < n2) return -1;
  if (n1 > n2) return 1;
  return 0;
}
