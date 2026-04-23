const MAX_LENGTH = 8192;

export function formatErrorForStorage(error: unknown): string {
  const message = error instanceof Error
    ? error.cause
      ? `${error.message} | cause: ${error.cause}`
      : error.message
    : String(error);

  return message.length > MAX_LENGTH
    ? message.slice(0, MAX_LENGTH) + '… [truncated]'
    : message;
}
