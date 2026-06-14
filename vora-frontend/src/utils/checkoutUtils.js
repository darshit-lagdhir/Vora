/**
 * Detects credit card brand based on first digits.
 */
export const getCardBrand = (number) => {
  if (!number) return 'generic';
  const clean = number.replace(/\D/g, '');
  if (clean.startsWith('4')) return 'visa';
  if (clean.startsWith('5')) return 'mastercard';
  if (clean.startsWith('3')) return 'amex';
  return 'generic';
};

/**
 * Formats card numbers with spaces every 4 digits, limiting to max brand digits.
 */
export const formatCardNumber = (value) => {
  const clean = value.replace(/\D/g, '');
  const brand = getCardBrand(clean);
  const maxDigits = brand === 'amex' ? 15 : 16;
  const limited = clean.substring(0, maxDigits);
  return limited.replace(/(\d{4})(?=\d)/g, '$1 ');
};

/**
 * Formats expiry input to MM/YY format.
 */
export const formatExpiry = (value) => {
  let clean = value.replace(/\D/g, '').substring(0, 4);
  if (clean.length > 2) {
    return clean.substring(0, 2) + '/' + clean.substring(2);
  }
  return clean;
};

/**
 * Formats CVC input, limiting to brand-specific lengths.
 */
export const formatCvc = (value, cardNumber = '') => {
  const clean = value.replace(/\D/g, '');
  const brand = getCardBrand(cardNumber);
  const maxLen = brand === 'amex' ? 4 : 3;
  return clean.substring(0, maxLen);
};

/**
 * Calculates payment totals based on base price.
 */
export const calculateTotals = (subtotal = 149.00) => {
  const tax = Math.round(subtotal * 0.05 * 100) / 100;     // 5% tax
  const fee = 3.55;                                        // Platform fee
  const grandTotal = Math.round((subtotal + tax + fee) * 100) / 100;
  return { subtotal, tax, fee, grandTotal };
};
