const SECRET_PATTERN = /(access[_-]?token|bearer\s+)[a-z0-9_\-.]{8,}/gi;

export function squareErrorMessage(error: unknown) {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return sanitize(error);

  const record = error as {
    message?: string;
    errors?: { detail?: string; code?: string }[];
    body?: { errors?: { detail?: string; code?: string }[] };
    statusCode?: number;
  };

  const details = record.errors ?? record.body?.errors ?? [];
  const detail = details.map((item) => item.detail || item.code).filter(Boolean).join(" ");
  if (detail) return sanitize(detail);
  if (record.statusCode === 401) {
    return "Square rejected the access token. Check SQUARE_ACCESS_TOKEN and that it has catalog and inventory permissions.";
  }
  if (record.statusCode === 429) {
    return "Square rate-limited the request. Wait a moment, then sync again.";
  }
  if (record.message) return sanitize(record.message);
  return "Square request failed.";
}

function sanitize(value: string) {
  return value.replace(SECRET_PATTERN, "[redacted]").slice(0, 500);
}

export function statusOf(error: unknown) {
  const record = error as { statusCode?: number; status?: number; response?: { status?: number } };
  return record.statusCode || record.status || record.response?.status || 0;
}
