import { QueryFailedError } from 'typeorm';

export function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code === '23505'
  );
}
