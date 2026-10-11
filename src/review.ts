import type { Client, Data, Entry } from './model';
import { addDays, validateEntry } from './model';

export type ReviewFilters = {
  week: string;
  clientId: string;
  employee: string;
  status: string;
  search: string;
};
export type EntryPatch = Partial<
  Pick<Entry, 'clientId' | 'billable' | 'reviewed'>
>;
// Per-entry before/after copies of one review action. Undo restores only these
// entries, and only while they still match `after`, so newer work is never
// silently overwritten.
export type UndoRecord = { label: string; before: Entry[]; after: Entry[] };

export function selectWeek(entries: Entry[], week: string) {
  return entries.filter(
    (entry) => entry.date >= week && entry.date <= addDays(week, 6),
  );
}
export function selectReview(
  entries: Entry[],
  clients: Client[],
  filters: ReviewFilters,
) {
  return selectWeek(entries, filters.week)
    .filter(
      (entry) =>
        (filters.clientId === 'all' || entry.clientId === filters.clientId) &&
        (filters.employee === 'all' || entry.employee === filters.employee) &&
        (filters.status === 'all' ||
          !!entry.reviewed === (filters.status === 'reviewed')) &&
        `${entry.description} ${clients.find((c) => c.id === entry.clientId)?.name ?? ''} ${entry.employee}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.employee.localeCompare(b.employee) ||
        a.id.localeCompare(b.id),
    );
}
export function applyEntryUpdate(previous: Entry, next: Entry): Entry {
  const changed =
    previous.date !== next.date ||
    previous.minutes !== next.minutes ||
    previous.clientId !== next.clientId ||
    previous.billable !== next.billable ||
    previous.description !== next.description ||
    previous.employee !== next.employee;
  return { ...next, reviewed: changed ? false : previous.reviewed };
}
export function saveEntry(
  data: Data,
  entry: Entry,
  client?: Client,
  original?: Entry,
): Data {
  const previous = data.entries.find((e) => e.id === entry.id);
  if (
    original &&
    (!previous || JSON.stringify(previous) !== JSON.stringify(original))
  )
    throw new Error(
      'This entry changed while you were editing. Close and reopen it to use the latest version.',
    );
  const clients = client ? [...data.clients, client] : data.clients;
  validateEntry(entry, clients);
  return {
    ...data,
    clients,
    entries: [
      ...data.entries.filter((e) => e.id !== entry.id),
      previous
        ? applyEntryUpdate(previous, entry)
        : { ...entry, reviewed: false },
    ],
  };
}
export function updateEntries(
  data: Data,
  ids: string[],
  patch: EntryPatch,
): Data {
  const selected = new Set(ids);
  if (ids.some((id) => !data.entries.some((e) => e.id === id)))
    throw new Error('An entry no longer exists. Refresh your selection.');
  return {
    ...data,
    entries: data.entries.map((entry) => {
      if (!selected.has(entry.id)) return entry;
      // Same rule as the edit form: a correction to a reviewed entry sends it
      // back to review; an explicit review/reopen patch sets the state.
      const merged = applyEntryUpdate(entry, { ...entry, ...patch });
      if (patch.reviewed !== undefined) merged.reviewed = patch.reviewed;
      validateEntry(merged, data.clients);
      return merged;
    }),
  };
}
function sameEntry(a: Entry, b: Entry) {
  return (
    a.date === b.date &&
    a.minutes === b.minutes &&
    a.clientId === b.clientId &&
    a.billable === b.billable &&
    a.description === b.description &&
    a.employee === b.employee &&
    !!a.reviewed === !!b.reviewed
  );
}
export function createUndoRecord(
  before: Data,
  after: Data,
  ids: string[],
  label: string,
): UndoRecord {
  const pick = (data: Data) => data.entries.filter((e) => ids.includes(e.id));
  return { label, before: pick(before), after: pick(after) };
}
export function undoEntries(data: Data, operation: UndoRecord): Data {
  const conflicts = operation.after.flatMap((expected) => {
    const current = data.entries.find((e) => e.id === expected.id);
    if (!current)
      return [`“${expected.description || 'An entry'}” no longer exists`];
    return sameEntry(current, expected)
      ? []
      : [`“${expected.description || 'An entry'}” changed after that action`];
  });
  if (conflicts.length)
    throw new Error(
      `Can’t undo: ${conflicts.join('; ')}. Nothing was undone, so newer work is kept.`,
    );
  const before = new Map(operation.before.map((e) => [e.id, e]));
  for (const entry of operation.before) validateEntry(entry, data.clients);
  return {
    ...data,
    entries: data.entries.map((e) => before.get(e.id) ?? e),
  };
}
