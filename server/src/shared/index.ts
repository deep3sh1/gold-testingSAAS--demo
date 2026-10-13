/**
 * Canonical Timezone for GOLDSCOPE Indian Business Operations
 */
export const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date formatted as YYYY-MM-DD in Asia/Kolkata timezone,
 * regardless of the host/server/browser machine's local timezone.
 */
export function getIndianBusinessDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA produces YYYY-MM-DD
  return formatter.format(date);
}

/**
 * Formats a Date or businessDate (YYYY-MM-DD) into Indian Display format DD/MM/YYYY
 */
export function formatIndianDateDisplay(input?: string | Date | null): string {
  if (!input) {
    input = new Date();
  }
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [year, month, day] = input.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return formatIndianDateDisplay(d);
    }
    return input;
  }

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIAN_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(input);
}

/**
 * Formats Indian Time display HH:MM AM/PM
 */
export function formatIndianTimeDisplay(input?: string | Date | null): string {
  if (!input) {
    input = new Date();
  }
  const d = typeof input === 'string' ? new Date(input) : input;
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(d);
}

/**
 * Normalizes Indian Phone numbers into canonical E.164 format: +91XXXXXXXXXX
 * Handles:
 * - 9876543210 -> +919876543210
 * - 09876543210 -> +919876543210
 * - +91 98765 43210 -> +919876543210
 * - 919876543210 -> +919876543210
 */
export function normalizeIndianPhone(rawPhone: string): {
  isValid: boolean;
  canonical: string;
  nationalNumber: string;
  formatted: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, canonical: '', nationalNumber: '', formatted: '', error: 'Phone number is required' };
  }

  // Strip all non-digit characters except leading +
  const cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  let digits = cleaned.replace(/^\+/, '');

  // If starts with 91 and has 12 digits, strip 91 for national extraction
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Indian mobile numbers must be 10 digits starting with 6, 7, 8, 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(digits)) {
    return {
      isValid: false,
      canonical: '',
      nationalNumber: digits,
      formatted: rawPhone,
      error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.',
    };
  }

  const canonical = `+91${digits}`;
  const formatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

  return {
    isValid: true,
    canonical,
    nationalNumber: digits,
    formatted,
  };
}

/**
 * Maps a branch identifier to its unique 2-letter token prefix.
 * Kalyan (West) -> KW
 * Kalyan (East) -> KE
 * Ulhasnagar    -> UL
 * Dombivli      -> DB
 */
export function getBranchTokenPrefix(branch?: string): string {
  const b = (branch || 'kalyan').toLowerCase().trim();
  if (b.includes('east') || b.includes('kolse')) return 'KE';
  if (b.includes('ulhas')) return 'UL';
  if (b.includes('dombi')) return 'DB';
  if (b.includes('kalyan') || b.includes('west') || b.includes('bazar')) return 'KW';
  return b.substring(0, 2).toUpperCase() || 'KW';
}

/**
 * Normalizes branch key across different casing and naming variations
 */
export function normalizeBranchKey(branch?: string): string {
  const b = (branch || 'kalyan').toLowerCase().trim();
  if (b.includes('east') || b.includes('kolse')) return 'kalyan_east';
  if (b.includes('ulhas')) return 'ulhasnagar';
  if (b.includes('dombi')) return 'dombivali';
  return 'kalyan';
}

/**
 * Generates formatted token number e.g. KW-20261006-001 or UL-20261006-001
 */
export function formatTokenNumber(prefix: string, businessDate: string, sequence: number): string {
  const cleanDate = businessDate.replace(/-/g, '');
  const seqPadded = String(sequence).padStart(3, '0');
  const cleanPrefix = (prefix || 'KW').toUpperCase().trim();
  return `${cleanPrefix}-${cleanDate}-${seqPadded}`;
}

/**
 * Safe numeric parsing for testerValue (e.g. 2.5, 8.2) without losing precision
 */
export function parseTesterNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.round(num * 10000) / 10000;
}

