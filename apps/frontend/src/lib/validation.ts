// Mirrors apps/backend/src/common/utils/password.validator.ts — kept in sync by hand
// since it's a one-line regex, not worth a shared package for.
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!@#$%^&*()\-_=+.,?]{8,}$/;
