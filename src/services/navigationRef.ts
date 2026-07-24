import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Общий navigation ref, вынесенный из App.tsx в отдельный модуль, чтобы к нему
 * могли обращаться и App.tsx (уведомления, сброс на логин), и CallContext
 * (открытие экрана звонка) без циклического импорта между ними.
 * Shared navigation ref, pulled out of App.tsx into its own module so both
 * App.tsx (notifications, reset-to-login) and CallContext (opening the call
 * screen) can use it without a circular import between them.
 */
export const navigationRef = createNavigationContainerRef();
