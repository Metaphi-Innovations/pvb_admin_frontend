type ApiErrorShape = {
  status?: number;
  message?: string;
  response?: { data?: { message?: string; error?: string }; status?: number };
};

export function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorShape | undefined;
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export function getMasterListErrorMessage(
  error: unknown,
  options: {
    resource: string;
    notFoundMessage?: string;
    serverMessage?: string;
  },
): string {
  const err = error as ApiErrorShape | undefined;
  const status = err?.status ?? err?.response?.status;

  if (status === 401) return "Unauthorized. Please login again.";
  // Prefer exact backend message for 403 (axios already toasts it)
  if (status === 403) return getErrorMessage(error, "Forbidden. You do not have access.");
  if (status === 404) {
    return options.notFoundMessage ?? `${options.resource} list endpoint not found.`;
  }
  if (status === 500) {
    return options.serverMessage ?? `Server error while loading ${options.resource}.`;
  }

  return getErrorMessage(error, `Unable to load ${options.resource}.`);
}

export function getMasterDetailErrorMessage(
  error: unknown,
  notFoundMessage: string,
  fallback: string,
): string {
  const err = error as ApiErrorShape | undefined;
  const status = err?.status ?? err?.response?.status;
  if (status === 404) return notFoundMessage;
  return getErrorMessage(error, fallback);
}
