const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const isPasswordStrong = (password: string): boolean =>
    PASSWORD_REGEX.test(password);
