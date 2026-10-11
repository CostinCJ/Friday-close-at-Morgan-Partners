import { useEffect, useState } from 'react';
import { validDate, weekStart } from './model';

// View state (page, week) that survives a refresh in this tab. Stored values
// are validated before use; storage errors fall back to the default.
export function readSession<T>(
  key: string,
  valid: (value: unknown) => value is T,
): T | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
export const REVIEW_WEEK_KEY = 'counsel.view.reviewWeek';
export function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not remembering the view is harmless.
  }
}
export function useSessionState<T>(
  key: string,
  initial: () => T,
  valid: (value: unknown) => value is T,
) {
  const [value, setValue] = useState<T>(
    () => readSession(key, valid) ?? initial(),
  );
  useEffect(() => writeSession(key, value), [key, value]);
  return [value, setValue] as const;
}
export function isWeekStart(value: unknown): value is string {
  return (
    typeof value === 'string' && validDate(value) && weekStart(value) === value
  );
}
