import { toErrorMessage } from './error-message.util';

const MAX_LENGTH = 8192;

function formatCauseForStorage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return '[unserializable cause]';
  }
}

export function formatErrorForStorage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.cause !== undefined && error.cause !== null
        ? `${error.message} | cause: ${formatCauseForStorage(error.cause)}`
        : error.message
      : toErrorMessage(error);

  return message.length > MAX_LENGTH
    ? message.slice(0, MAX_LENGTH) + '… [truncated]'
    : message;
}
