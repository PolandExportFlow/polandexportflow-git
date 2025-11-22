export const sanitizeEmail = (raw: string) => (raw || '').trim().toLowerCase();

export const isValidEmail = (raw: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(raw));

export const validatePassword = (password: string) => {
  if (!password) return { message: 'Password is required', field: 'password' } as const;
  if (password.length < 6) return { message: 'Password must be at least 6 characters long', field: 'password' } as const;
  // Jeśli nie chcesz wymagać znaku specjalnego – usuń ten blok.
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return { message: 'Password must contain at least one special character', field: 'password' } as const;
  return null;
};
