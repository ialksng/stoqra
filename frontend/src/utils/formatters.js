/**
 * Indian Localization Utilities (INR Currency, Lakhs/Crores, Indian Date/Time)
 */

/**
 * Format number into Indian Rupees (₹) with Indian digit grouping (Lakhs / Crores)
 * e.g., 150000 -> "₹1,50,000.00"
 * @param {number|string} val
 * @returns {string}
 */
export const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
};

/**
 * Format numbers with Indian comma grouping without currency symbol
 * e.g., 100000 -> "1,00,000"
 * @param {number|string} val
 * @returns {string}
 */
export const formatIndianNumber = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Format timestamps into standard Indian date & time (e.g. "22 Sep 2026, 11:00 pm")
 * @param {Date|string|number} date
 * @returns {string}
 */
export const formatIndianDate = (date) => {
  if (!date) return '-';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleString('en-IN');
  }
};

export default {
  formatINR,
  formatIndianNumber,
  formatIndianDate,
};
