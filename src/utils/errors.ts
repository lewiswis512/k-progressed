export function errorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : String(error);
}

export function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
