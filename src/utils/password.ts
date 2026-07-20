const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_RULES_MESSAGE =
    'Пароль: минимум 8 символов, заглавная и строчная буква, цифра';

export const isPasswordStrong = (password: string): boolean =>
    PASSWORD_REGEX.test(password);
