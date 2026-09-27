/**
 * Iranian Jalali Date & Currency Utility for Persian Accounting
 */

// Convert Gregorian date to Jalali date string (YYYY/MM/DD)
export function getJalaliDate(date: Date = new Date()): string {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy = gYear - 1600;
  let gm = gMonth - 1;
  let gd = gDay - 1;

  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);

  for (let i = 0; i < gm; ++i) {
    g_day_no += g_d_m[i];
  }
  if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    g_day_no++;
  }
  g_day_no += gd;

  let j_day_no = g_day_no - 79;

  let j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;

  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  let jm: number;
  let jd: number;

  if (j_day_no < 186) {
    jm = 1 + Math.floor(j_day_no / 31);
    jd = 1 + (j_day_no % 31);
  } else {
    jm = 7 + Math.floor((j_day_no - 186) / 30);
    jd = 1 + ((j_day_no - 186) % 30);
  }

  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;

  return `${jy}/${mm}/${dd}`;
}

export function getCurrentPersianTime(): string {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Convert English numbers to Persian glyphs
export function toPersianDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const str = num.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

// Format currency with commas and Persian digits: ۱۲,۵۰۰,۰۰۰ تومان
export function formatCurrency(amount: number, currency: string = 'تومان'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `۰ ${currency}`;
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `${toPersianDigits(formatted)} ${currency}`;
}

// Format plain number with thousand separators in Persian
export function formatNumber(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '۰';
  }
  const formatted = amount.toLocaleString('en-US');
  return toPersianDigits(formatted);
}

// Generate unique readable ID
export function generateId(prefix: string = 'ITEM'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export type AppCurrency = 'TOMAN' | 'USD' | 'EUR' | 'IRR';

export interface CurrencyMeta {
  code: AppCurrency;
  name: string;
  nameFa: string;
  symbol: string;
  defaultRate: number; // Rate relative to 1 Toman
  flag: string;
  isForeign: boolean;
}

export const CURRENCY_CONFIG: Record<AppCurrency, CurrencyMeta> = {
  TOMAN: {
    code: 'TOMAN',
    name: 'Toman',
    nameFa: 'تومان (ارز پایه)',
    symbol: 'تومان',
    defaultRate: 1,
    flag: '🇮🇷',
    isForeign: false,
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    nameFa: 'دلار آمریکا',
    symbol: '$',
    defaultRate: 65000, // 1 USD = 65,000 Tomans
    flag: '🇺🇸',
    isForeign: true,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    nameFa: 'یورو اروپا',
    symbol: '€',
    defaultRate: 71000, // 1 EUR = 71,000 Tomans
    flag: '🇪🇺',
    isForeign: true,
  },
  IRR: {
    code: 'IRR',
    name: 'Iranian Rial',
    nameFa: 'ریال ایران',
    symbol: 'ریال',
    defaultRate: 0.1, // 10 Rials = 1 Toman
    flag: '🇮🇷',
    isForeign: false,
  },
};

export function formatAmountWithCurrency(
  amount: number,
  currency: AppCurrency = 'TOMAN',
  includeSymbol: boolean = true
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }

  // If USD or EUR, format with 2 decimals if needed, or integers
  const isForeign = currency === 'USD' || currency === 'EUR';
  let formattedNumber = '';
  if (isForeign) {
    formattedNumber = Number(amount.toFixed(2)).toLocaleString('en-US');
  } else {
    formattedNumber = Math.round(amount).toLocaleString('en-US');
  }

  const persianFormatted = toPersianDigits(formattedNumber);

  if (!includeSymbol) return persianFormatted;

  if (currency === 'USD') return `$${persianFormatted}`;
  if (currency === 'EUR') return `€${persianFormatted}`;
  if (currency === 'IRR') return `${persianFormatted} ریال`;
  return `${persianFormatted} تومان`;
}

// Convert amount from one currency to another using rates in Tomans
export function convertCurrency(
  amount: number,
  from: AppCurrency,
  to: AppCurrency,
  rates?: { TOMAN?: number; USD?: number; EUR?: number; IRR?: number }
): number {
  if (from === to) return amount;

  const usdRate = rates?.USD || CURRENCY_CONFIG.USD.defaultRate;
  const eurRate = rates?.EUR || CURRENCY_CONFIG.EUR.defaultRate;
  const irrRate = rates?.IRR || CURRENCY_CONFIG.IRR.defaultRate;

  // Convert "from" to base Toman
  let amountInToman = amount;
  if (from === 'USD') amountInToman = amount * usdRate;
  else if (from === 'EUR') amountInToman = amount * eurRate;
  else if (from === 'IRR') amountInToman = amount * irrRate;

  // Convert base Toman to "to"
  if (to === 'TOMAN') return amountInToman;
  if (to === 'USD') return amountInToman / usdRate;
  if (to === 'EUR') return amountInToman / eurRate;
  if (to === 'IRR') return amountInToman / irrRate;

  return amountInToman;
}
