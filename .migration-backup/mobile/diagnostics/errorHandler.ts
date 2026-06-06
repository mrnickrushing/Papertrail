import { Alert } from 'react-native';

type ErrorUtilsLike = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
const defaultHandler = errorUtils?.getGlobalHandler?.();

function formatError(error: Error, isFatal?: boolean): string {
  const prefix = isFatal ? 'Fatal JavaScript error' : 'JavaScript error';
  const stack = typeof error.stack === 'string' ? `\n\n${error.stack}` : '';
  return `${prefix}: ${error.message}${stack}`;
}

errorUtils?.setGlobalHandler?.((error, isFatal) => {
  const message = formatError(error, isFatal);
  console.error(message);

  if (isFatal) {
    Alert.alert('FileTrail startup error', message.slice(0, 1800));
    return;
  }

  defaultHandler?.(error, isFatal);
});
