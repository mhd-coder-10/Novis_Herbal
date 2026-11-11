export const sanitizePhoneNumber = (val) => {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(-10);
};

export const isValidIndianPhone = (val) => {
  if (!val) return false;
  const digits = sanitizePhoneNumber(val);
  return /^[6-9]\d{9}$/.test(digits);
};

