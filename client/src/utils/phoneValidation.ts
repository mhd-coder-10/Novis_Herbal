import React from 'react';

/**
 * Sanitizes phone input by stripping all non-digit characters and limiting to 10 digits.
 */
export const sanitizePhoneNumber = (val: string | null | undefined): string => {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(0, 10);
};

/**
 * Validates standard 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export const isValidIndianPhone = (val: string | null | undefined): boolean => {
  if (!val) return false;
  const digits = sanitizePhoneNumber(val);
  return /^[6-9]\d{9}$/.test(digits);
};

/**
 * Blocks non-numeric keys on keydown while permitting navigation/edit keys and shortcuts.
 */
export const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'Enter',
    'Escape'
  ];

  if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
    return;
  }

  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

