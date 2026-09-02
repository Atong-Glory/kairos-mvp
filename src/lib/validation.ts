export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL_RE.test(email.trim());

export const parseAmount = (value: string): number => {
  const n = parseFloat(value.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong.') =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
