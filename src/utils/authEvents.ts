type AuthExpiredHandler = () => void;

let authExpiredHandler: AuthExpiredHandler | null = null;

export const setAuthExpiredHandler = (handler: AuthExpiredHandler) => {
    authExpiredHandler = handler;
};

export const triggerAuthExpired = () => {
    authExpiredHandler?.();
};
