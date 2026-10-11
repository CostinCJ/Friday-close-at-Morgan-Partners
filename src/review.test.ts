import { describe, expect, it } from 'vitest';
import { decodeData } from './model';
import type { Data } from './model';
import {
  createUndoRecord,
  saveEntry,
  selectReview,
  undoEntries,
  updateEntries,
} from './review';
import pilotWorkspace from './fixtures/pilot-workspace.json';

const pilot = (): Data => decodeData(JSON.stringify(pilotWorkspace));
const find = (data: Data, id: string) => data.entries.find((e) => e.id === id)!;

describe('review corrections require review again', () => {
  it('moving a reviewed entry to another client returns it to review', () => {
    const data = pilot();
    expect(find(data, 'entry-001').reviewed).toBe(true);
    const next = updateEntries(data, ['entry-001'], { clientId: 'foundation' });
    expect(find(next, 'entry-001')).toMatchObject({
      clientId: 'foundation',
      reviewed: false,
    });
  });
  it('changing billability of a reviewed entry returns it to review', () => {
    const next = updateEntries(pilot(), ['entry-003'], { billable: false });
    expect(find(next, 'entry-003')).toMatchObject({
      billable: false,
      reviewed: false,
    });
  });
  it('keeps review when a bulk action changes nothing', () => {
    const next = updateEntries(pilot(), ['entry-001'], {
      clientId: 'meridian',
    });
    expect(find(next, 'entry-001').reviewed).toBe(true);
  });
  it('still marks and reopens review explicitly', () => {
    const marked = updateEntries(pilot(), ['entry-002'], { reviewed: true });
    expect(find(marked, 'entry-002').reviewed).toBe(true);
    const reopened = updateEntries(marked, ['entry-001'], { reviewed: false });
    expect(find(reopened, 'entry-001').reviewed).toBe(false);
  });
  it('keeps review on an unchanged form save and drops it on a real edit', () => {
    const data = pilot();
    const original = find(data, 'entry-001');
    expect(
      find(saveEntry(data, { ...original }, undefined, original), 'entry-001')
        .reviewed,
    ).toBe(true);
    expect(
      find(
        saveEntry(
          data,
          { ...original, description: 'Edited' },
          undefined,
          original,
        ),
        'entry-001',
      ).reviewed,
    ).toBe(false);
  });
});

describe('undo of a review action', () => {
  it('reverts only the affected entries and keeps independent work', () => {
    const start = pilot();
    const afterMove = updateEntries(start, ['entry-001'], {
      clientId: 'foundation',
    });
    const undo = createUndoRecord(start, afterMove, ['entry-001'], 'Moved');
    // Independent correction to a different entry after the review action.
    const later: Data = {
      ...afterMove,
      entries: afterMove.entries.map((e) =>
        e.id === 'entry-002' ? { ...e, description: 'Team planning' } : e,
      ),
    };
    const undone = undoEntries(later, undo);
    expect(find(undone, 'entry-001')).toEqual(find(start, 'entry-001'));
    expect(find(undone, 'entry-002').description).toBe('Team planning');
    expect(undone.entries).toHaveLength(start.entries.length);
  });
  it('declines, without changing data, when an affected entry changed afterwards', () => {
    const start = pilot();
    const afterMove = updateEntries(start, ['entry-001', 'entry-005'], {
      clientId: 'northstar',
    });
    const undo = createUndoRecord(
      start,
      afterMove,
      ['entry-001', 'entry-005'],
      'Moved',
    );
    const later: Data = {
      ...afterMove,
      entries: afterMove.entries.map((e) =>
        e.id === 'entry-005' ? { ...e, minutes: 165 } : e,
      ),
    };
    expect(() => undoEntries(later, undo)).toThrow(
      /Transaction due diligence.*changed after that action/,
    );
  });
  it('declines when an affected entry was deleted afterwards', () => {
    const start = pilot();
    const after = updateEntries(start, ['entry-001'], { reviewed: false });
    const undo = createUndoRecord(start, after, ['entry-001'], 'Returned');
    const later = {
      ...after,
      entries: after.entries.filter((e) => e.id !== 'entry-001'),
    };
    expect(() => undoEntries(later, undo)).toThrow(/no longer exists/);
  });
});

describe('review filters', () => {
  it('narrows to one client without matching similarly named clients', () => {
    const rows = selectReview(pilot().entries, pilot().clients, {
      week: '2026-09-28',
      clientId: 'meridian',
      employee: 'all',
      status: 'all',
      search: '',
    });
    expect(rows.map((e) => e.id)).toEqual([
      'entry-001',
      'entry-005',
      'entry-011',
      'entry-014',
      'entry-017',
    ]);
  });
});
