import { useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Pencil,
  Search,
  Undo2,
} from 'lucide-react';
import type { Data, Entry } from '../model';
import {
  addDays,
  csv,
  download,
  duration,
  localDate,
  shortDate,
  totals,
  weekStart,
} from '../model';
import {
  createUndoRecord,
  selectReview,
  undoEntries,
  updateEntries,
} from '../review';
import type { EntryPatch, ReviewFilters, UndoRecord } from '../review';

export function ReviewPage({
  data,
  save,
  onEdit,
  readOnly,
}: {
  data: Data;
  save: (data: Data) => void;
  onEdit: (entry: Entry) => void;
  readOnly: boolean;
}) {
  const [filters, setFilters] = useState<ReviewFilters>(() => ({
    week: weekStart(
      data.entries
        .map((e) => e.date)
        .sort()
        .at(-1) ?? localDate(),
    ),
    clientId: 'all',
    employee: 'all',
    status: 'all',
    search: '',
  }));
  const { week } = filters;
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState('review');
  const [targetClient, setTargetClient] = useState(data.clients[0]?.id ?? '');
  const [operation, setOperation] = useState<UndoRecord | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const visible = selectReview(data.entries, data.clients, filters);
  // Totals, export and actions all work on the rows in view, never on
  // rows hidden by the week or filters.
  const summary = totals(visible);
  const exportEntries = visible;
  const selectedEntries = visible.filter((e) => selected.includes(e.id));
  const selectedIds = selectedEntries.map((e) => e.id);
  const employees = [...new Set(data.entries.map((e) => e.employee))].sort();
  const targetName =
    data.clients.find((c) => c.id === targetClient)?.name ?? 'client';
  const patch: EntryPatch =
    action === 'client'
      ? { clientId: targetClient }
      : action === 'review' || action === 'reopen'
        ? { reviewed: action === 'review' }
        : { billable: action === 'billable' };
  const actionName =
    action === 'client' ? `Move to ${targetName}` : ACTION_NAMES[action];
  const reopening = reopenedBy(selectedEntries, patch).length;
  // Keep selected rows the new view still shows; deselect the rest and say
  // so, so an action can never reach a row the user cannot see.
  function changeView(change: Partial<ReviewFilters>) {
    const next = { ...filters, ...change };
    const stillVisible = new Set(
      selectReview(data.entries, data.clients, next).map((e) => e.id),
    );
    const kept = selectedIds.filter((id) => stillVisible.has(id));
    const dropped = selectedIds.length - kept.length;
    setFilters(next);
    setSelected(kept);
    if (dropped)
      setMessage(
        `Deselected ${count(dropped, 'entry', 'entries')} no longer in this view. ${count(kept.length, 'entry', 'entries')} still selected.`,
      );
  }
  function apply(
    entries: Entry[],
    change: EntryPatch,
    { keepSelection = false } = {},
  ) {
    setError('');
    const ids = entries.map((e) => e.id);
    try {
      const next = updateEntries(data, ids, change);
      const label = describeAction(change, ids.length, data);
      const reopened = reopenedBy(entries, change).length;
      save(next);
      setOperation(createUndoRecord(data, next, ids, label));
      if (!keepSelection) setSelected([]);
      setMessage(
        reopened
          ? `${label}. ${count(reopened, 'reviewed entry', 'reviewed entries')} ${reopened === 1 ? 'needs' : 'need'} review again.`
          : `${label}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="review-page" aria-label="Weekly review">
      <div className="period-toolbar">
        <div className="week-selector">
          <button
            className="icon-button"
            aria-label="Previous review week"
            onClick={() => changeView({ week: addDays(week, -7) })}
          >
            <ChevronLeft size={18} />
          </button>
          <label className="review-date">
            Week of
            <input
              aria-label="Review week"
              type="date"
              value={week}
              onChange={(e) =>
                e.target.value &&
                changeView({ week: weekStart(e.target.value) })
              }
            />
          </label>
          <button
            className="icon-button"
            aria-label="Next review week"
            onClick={() => changeView({ week: addDays(week, 7) })}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          className="button secondary small"
          disabled={!visible.length}
          onClick={() => {
            download(
              csv(exportEntries, data.clients),
              `counsel-review-${week}.csv`,
              'text/csv;charset=utf-8',
            );
            setMessage(
              `Exported ${count(exportEntries.length, 'entry', 'entries')} in this view.`,
            );
          }}
        >
          <ArrowDownToLine size={16} />
          Export view
        </button>
      </div>
      <div className="review-progress">
        <span className="review-emblem">
          <ClipboardCheck size={24} />
        </span>
        <div>
          <h2>Weekly review</h2>
          <p>Check time entries and prepare this week's records.</p>
        </div>
      </div>
      <div className="review-summary" aria-label="Review summary">
        <div>
          <span>Entries in view</span>
          <strong>{visible.length}</strong>
        </div>
        <div>
          <span>Time in view</span>
          <strong data-testid="review-total">{duration(summary.total)}</strong>
        </div>
        <div>
          <span>Billable in view</span>
          <strong>{duration(summary.billable)}</strong>
        </div>
        <div>
          <span>Reviewed in view</span>
          <strong>
            {visible.filter((e) => e.reviewed).length} / {visible.length}
          </strong>
        </div>
      </div>
      <div className="entries-panel">
        <div className="panel-title">
          <div>
            <h2>Check the details.</h2>
            <p>Select entries and update the week’s records.</p>
          </div>
        </div>
        <div className="filters review-filters">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search review"
              placeholder="Find an entry…"
              value={filters.search}
              onChange={(e) => changeView({ search: e.target.value })}
            />
          </label>
          <select
            aria-label="Review client"
            value={filters.clientId}
            onChange={(e) => changeView({ clientId: e.target.value })}
          >
            <option value="all">All clients</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Review employee"
            value={filters.employee}
            onChange={(e) => changeView({ employee: e.target.value })}
          >
            <option value="all">All team members</option>
            {employees.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            aria-label="Review status"
            value={filters.status}
            onChange={(e) => changeView({ status: e.target.value })}
          >
            <option value="all">All review states</option>
            <option value="pending">Needs review</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
        <div className="bulk-toolbar">
          <label className="select-visible">
            <input
              type="checkbox"
              aria-label="Select visible entries"
              checked={
                visible.length > 0 && selectedIds.length === visible.length
              }
              disabled={!visible.length || readOnly}
              onChange={(e) =>
                setSelected(e.target.checked ? visible.map((e) => e.id) : [])
              }
            />
            Select visible
          </label>
          <span className="selection-count">{selectedIds.length} selected</span>
          <select
            aria-label="Bulk action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="review">Mark reviewed</option>
            <option value="reopen">Return to review</option>
            <option value="billable">Mark billable</option>
            <option value="nonbillable">Mark non-billable</option>
            <option value="client">Move to client</option>
          </select>
          {action === 'client' && (
            <select
              aria-label="Destination client"
              value={targetClient}
              onChange={(e) => setTargetClient(e.target.value)}
            >
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="button primary small"
            disabled={!selectedIds.length || readOnly}
            onClick={() => apply(selectedEntries, patch)}
          >
            Apply to {selectedIds.length} selected
          </button>
          <p className="action-scope" data-testid="action-scope">
            {selectedIds.length ? (
              <>
                <strong>
                  {actionName}: {count(selectedIds.length, 'entry', 'entries')}{' '}
                  ({duration(totals(selectedEntries).total)})
                </strong>
                {' · highlighted below'}
                {reopening > 0 &&
                  ` · ${count(reopening, 'reviewed entry', 'reviewed entries')} will need review again`}
              </>
            ) : (
              'Select entries in this view to update them. Actions only change selected rows shown below.'
            )}
          </p>
        </div>
        {error && (
          <p className="form-error review-feedback" role="alert">
            {error}
          </p>
        )}
        <div className="review-notice" aria-live="polite">
          {message && <span>{message}</span>}
          {operation && (
            <button
              className="text-button"
              disabled={readOnly}
              onClick={() => {
                try {
                  save(undoEntries(data, operation));
                  setError('');
                  setMessage(`Undone: ${operation.label}.`);
                } catch (e) {
                  setError((e as Error).message);
                  setMessage('');
                }
                setOperation(null);
              }}
            >
              <Undo2 size={14} />
              Undo: {operation.label}
            </button>
          )}
        </div>
        {!visible.length ? (
          <div className="empty-state">
            <ClipboardCheck size={28} />
            <h3>Nothing in this view.</h3>
            <p>Choose another week or adjust your filters.</p>
          </div>
        ) : (
          <div className="review-rows">
            {visible.map((entry) => {
              const client = data.clients.find((c) => c.id === entry.clientId)!;
              return (
                <article
                  className={`review-row ${selectedIds.includes(entry.id) ? 'is-selected' : ''}`}
                  data-entry-id={entry.id}
                  key={entry.id}
                >
                  <label className="review-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Select ${entry.description || client.name}`}
                      checked={selectedIds.includes(entry.id)}
                      disabled={readOnly}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selectedIds, entry.id]
                            : selectedIds.filter((id) => id !== entry.id),
                        )
                      }
                    />
                  </label>
                  <div className="review-entry">
                    <div className="review-entry-meta">
                      <span style={{ background: client.color }} />
                      <strong>{client.name}</strong>
                      <span>{shortDate(entry.date)}</span>
                    </div>
                    <p>{entry.description || 'No description'}</p>
                    <span className="review-employee">{entry.employee}</span>
                  </div>
                  <div className="review-duration">
                    <strong>{duration(entry.minutes)}</strong>
                    <span
                      className={`status-tag ${entry.billable ? 'billable' : ''}`}
                    >
                      {entry.billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </div>
                  <button
                    className={`review-state ${entry.reviewed ? 'is-reviewed' : ''}`}
                    disabled={readOnly}
                    aria-label={`${entry.reviewed ? 'Reopen' : 'Review'} ${entry.description || client.name}`}
                    onClick={() =>
                      apply(
                        [entry],
                        { reviewed: !entry.reviewed },
                        { keepSelection: true },
                      )
                    }
                  >
                    {entry.reviewed && <Check size={13} />}{' '}
                    {entry.reviewed ? 'Reviewed' : 'Needs review'}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Edit review entry: ${entry.description || client.name}`}
                    disabled={readOnly}
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <div className="table-footer">
          <span>
            {visible.length} entries · {shortDate(week)} –{' '}
            {shortDate(addDays(week, 6))}
          </span>
          <span>
            Export includes the {count(visible.length, 'entry', 'entries')} in
            this view, not just the selection.
          </span>
        </div>
      </div>
    </section>
  );
}
const ACTION_NAMES: Record<string, string> = {
  review: 'Mark reviewed',
  reopen: 'Return to review',
  billable: 'Mark billable',
  nonbillable: 'Mark non-billable',
};
function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
// Reviewed entries whose checked values a correction would actually change.
function reopenedBy(entries: Entry[], patch: EntryPatch) {
  return entries.filter(
    (e) =>
      e.reviewed &&
      ((patch.clientId !== undefined && patch.clientId !== e.clientId) ||
        (patch.billable !== undefined && patch.billable !== e.billable)),
  );
}
function describeAction(patch: EntryPatch, n: number, data: Data) {
  const entries = count(n, 'entry', 'entries');
  if (patch.clientId !== undefined)
    return `Moved ${entries} to ${data.clients.find((c) => c.id === patch.clientId)?.name ?? 'another client'}`;
  if (patch.billable !== undefined)
    return `Marked ${entries} ${patch.billable ? 'billable' : 'non-billable'}`;
  return patch.reviewed
    ? `Marked ${entries} reviewed`
    : `Returned ${entries} to review`;
}
