export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  error: unknown | null;
  data: T | null;
  timeStamp: string;
}

export function buildResponse<T>(
  data: T,
  message = 'Successful',
  success = true,
): ApiResponse<T> {
  return {
    success,
    message,
    error: null,
    data,
    timeStamp: new Date().toISOString(),
  };
}

export function buildErrorResponse(
  error: unknown,
  message = 'An error occurred',
): ApiResponse<null> {
  return {
    success: false,
    message,
    error,
    data: null,
    timeStamp: new Date().toISOString(),
  };
}
