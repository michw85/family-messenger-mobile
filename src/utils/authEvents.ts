type AuthExpiredHandler = () => void;
type AuthLoggedInHandler = (token: string) => void;

// Список слушателей, а не один слот - и Navigation(), и CallProvider должны
// независимо реагировать на логин/логаут.
// A list of listeners, not a single slot - both Navigation() and CallProvider
// need to react to login/logout independently.
let expiredHandlers: AuthExpiredHandler[] = [];
let loggedInHandlers: AuthLoggedInHandler[] = [];

export const setAuthExpiredHandler = (handler: AuthExpiredHandler) => {
    expiredHandlers.push(handler);
    return () => {
        expiredHandlers = expiredHandlers.filter((h) => h !== handler);
    };
};

export const triggerAuthExpired = () => {
    expiredHandlers.forEach((h) => h());
};

export const setAuthLoggedInHandler = (handler: AuthLoggedInHandler) => {
    loggedInHandlers.push(handler);
    return () => {
        loggedInHandlers = loggedInHandlers.filter((h) => h !== handler);
    };
};

export const triggerAuthLoggedIn = (token: string) => {
    loggedInHandlers.forEach((h) => h(token));
};
