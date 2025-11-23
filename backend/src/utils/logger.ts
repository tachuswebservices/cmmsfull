import morgan from 'morgan';

export const httpLogger = morgan('dev');

export function log(...args: unknown[]) {
  // Basic console logger wrapper
  // eslint-disable-next-line no-console
  console.log('[backend]', ...args);
}

