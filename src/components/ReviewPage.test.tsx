import { useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeData } from '../model';
import type { Data } from '../model';
import pilotWorkspace from '../fixtures/pilot-workspace.json';
import { ReviewPage } from './ReviewPage';

const downloads = vi.hoisted(() => [] as string[]);
vi.mock('../model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../model')>()),
  download: (content: string) => downloads.push(content),
}));

let latest: Data;
// Stands in for an edit made outside the review actions (the entry form).
let editElsewhere: (id: string, change: Partial<Data['entries'][0]>) => void;
function Harness({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  latest = data;
  editElsewhere = (id, change) =>
    act(() =>
      setData((d) => ({
        ...d,
        entries: d.entries.map((e) => (e.id === id ? { ...e, ...change } : e)),
      })),
    );
  return (
    <ReviewPage
      data={data}
      save={(next) => setData(next)}
      onEdit={() => {}}
      readOnly={false}
    />
  );
}
function setup() {
  render(<Harness initial={decodeData(JSON.stringify(pilotWorkspace))} />);
  return userEvent.setup();
}
const rows = () =>
  [...document.querySelectorAll('.review-row')].map((r) =>
    r.getAttribute('data-entry-id'),
  );
const summary = () => screen.getByLabelText('Review summary');

beforeEach(() => {
  downloads.length = 0;
});

describe('Weekly review totals and export follow the active view', () => {
  it('opens on the pilot week and totals every entry in it', () => {
    setup();
    expect(screen.getByLabelText('Review week')).toHaveValue('2026-09-28');
    expect(rows()).toHaveLength(18);
    expect(screen.getByTestId('review-total')).toHaveTextContent('22h 30m');
  });
  it('totals only the rows shown when narrowed to one client', async () => {
    const user = setup();
    await user.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    expect(rows()).toHaveLength(5);
    // 90 + 150 + 60 + 60 + 30 minutes; 30m relationship work is non-billable.
    expect(screen.getByTestId('review-total')).toHaveTextContent('6h 30m');
    expect(within(summary()).getByText('6h')).toBeInTheDocument();
  });
  it('exports exactly the filtered rows, not the whole week or the selection', async () => {
    const user = setup();
    await user.selectOptions(
      screen.getByLabelText('Review employee'),
      'Sofia Keller',
    );
    await user.selectOptions(
      screen.getByLabelText('Review status'),
      'reviewed',
    );
    expect(rows()).toEqual([
      'entry-003',
      'entry-005',
      'entry-009',
      'entry-013',
    ]);
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Investment documents' }),
    );
    await user.click(screen.getByRole('button', { name: /Export view/ }));
    const lines = downloads[0].trim().split('\r\n');
    expect(lines).toHaveLength(1 + 4);
    expect(lines.slice(1).every((l) => l.includes('"Sofia Keller"'))).toBe(
      true,
    );
    expect(downloads[0]).not.toContain('Billing preparation');
  });
});

describe('Selection scope', () => {
  it('deselects rows a filter hides, says so, and does not reselect them later', async () => {
    const user = setup();
    await user.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    await user.click(screen.getByLabelText('Select visible entries'));
    expect(screen.getByText('5 selected')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Review client'),
      'northstar',
    );
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Deselected 5 entries no longer in this view. 0 entries still selected.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Apply to 0 selected/ }),
    ).toBeDisabled();
    // Widening the view again must not silently bring the selection back.
    await user.selectOptions(screen.getByLabelText('Review client'), 'all');
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });
  it('keeps selected rows that are still in view when narrowing', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Select Shareholder agreement review',
      }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.selectOptions(
      screen.getByLabelText('Review client'),
      'meridian',
    );
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Select Shareholder agreement review',
      }),
    ).toBeChecked();
    expect(
      screen.getByText(
        'Deselected 1 entry no longer in this view. 1 entry still selected.',
      ),
    ).toBeInTheDocument();
  });
  it('typing a search that still matches keeps the selection without a notice', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.type(screen.getByLabelText('Search review'), 'planning');
    expect(rows()).toEqual(['entry-002']);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.queryByText(/Deselected/)).not.toBeInTheDocument();
  });
  it('describes which records the next action will change before applying it', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Select Shareholder agreement review',
      }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.selectOptions(screen.getByLabelText('Bulk action'), 'client');
    await user.selectOptions(
      screen.getByLabelText('Destination client'),
      'foundation',
    );
    const scope = screen.getByTestId('action-scope');
    expect(scope).toHaveTextContent(
      'Move to Meridian Foundation: 2 entries (2h 15m)',
    );
    expect(scope).toHaveTextContent('1 reviewed entry will need review again');
  });
  it('a row review toggle keeps the bulk selection', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Review Lease amendment notes' }),
    );
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});

describe('Corrections and undo from the review page', () => {
  it('a client correction sends a reviewed entry back to review, and undo restores it', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Select Shareholder agreement review',
      }),
    );
    await user.selectOptions(screen.getByLabelText('Bulk action'), 'client');
    await user.selectOptions(
      screen.getByLabelText('Destination client'),
      'foundation',
    );
    await user.click(
      screen.getByRole('button', { name: /Apply to 1 selected/ }),
    );
    expect(
      screen.getByRole('button', {
        name: 'Review Shareholder agreement review',
      }),
    ).toHaveTextContent('Needs review');
    await user.click(
      screen.getByRole('button', { name: /Undo: Moved 1 entry/ }),
    );
    const restored = latest.entries.find((e) => e.id === 'entry-001')!;
    expect(restored).toMatchObject({ clientId: 'meridian', reviewed: true });
  });
  it('undo keeps a newer independent correction', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.selectOptions(screen.getByLabelText('Bulk action'), 'review');
    await user.click(
      screen.getByRole('button', { name: /Apply to 1 selected/ }),
    );
    // A later correction to a different entry through the edit form.
    editElsewhere('entry-004', { description: 'Lease amendment notes v2' });
    await user.click(
      screen.getByRole('button', { name: /Undo: Marked 1 entry reviewed/ }),
    );
    const byId = (id: string) => latest.entries.find((e) => e.id === id)!;
    expect(byId('entry-002').reviewed).toBe(false);
    expect(byId('entry-004').description).toBe('Lease amendment notes v2');
  });
  it('declines an undo that would overwrite a newer change to the same entry', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.click(
      screen.getByRole('button', { name: /Apply to 1 selected/ }),
    );
    editElsewhere('entry-002', { minutes: 50 });
    await user.click(
      screen.getByRole('button', { name: /Undo: Marked 1 entry reviewed/ }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /changed after that action.*Nothing was undone/,
    );
    expect(latest.entries.find((e) => e.id === 'entry-002')).toMatchObject({
      minutes: 50,
      reviewed: true,
    });
  });
});

describe('Needs-review shortcut', () => {
  it('shows only the entries still needing review, then returns to all states', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('button', { name: 'Show 11 needing review' }),
    );
    expect(rows()).toHaveLength(11);
    expect(screen.getByLabelText('Review status')).toHaveValue('pending');
    await user.click(
      screen.getByRole('button', { name: 'Show all review states' }),
    );
    expect(rows()).toHaveLength(18);
    expect(screen.getByLabelText('Review status')).toHaveValue('all');
  });
  it('counts what the shortcut would show even while viewing reviewed entries', async () => {
    const user = setup();
    await user.selectOptions(
      screen.getByLabelText('Review status'),
      'reviewed',
    );
    expect(rows()).toHaveLength(7);
    expect(
      screen.getByRole('button', { name: 'Show 11 needing review' }),
    ).toBeInTheDocument();
  });
  it('follows the selection rules and announces deselected rows', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Select Shareholder agreement review',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Show 11 needing review' }),
    );
    expect(
      screen.getByText(
        'Deselected 1 entry no longer in this view. 0 entries still selected.',
      ),
    ).toBeInTheDocument();
  });
  it('says when nothing is left to review in the view', async () => {
    const user = setup();
    await user.selectOptions(screen.getByLabelText('Review client'), 'oak');
    await user.click(screen.getByLabelText('Select visible entries'));
    await user.click(
      screen.getByRole('button', { name: /Apply to 3 selected/ }),
    );
    expect(
      screen.getByText('Nothing left to review in this view'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /needing review/ })).toBeNull();
  });
});

describe('Search typos keep the selection', () => {
  it('a mistyped then corrected search keeps the selected row, and says so meanwhile', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    const search = screen.getByLabelText('Search review');
    await user.type(search, 'plx');
    expect(rows()).toEqual([]);
    expect(screen.getByTestId('action-scope')).toHaveTextContent(
      '1 more selected but hidden by this view',
    );
    expect(screen.queryByText(/Deselected/)).not.toBeInTheDocument();
    await user.type(search, '{Backspace}anning');
    expect(rows()).toEqual(['entry-002']);
    expect(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    ).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
  it('actions and Select visible never drop rows hidden by search', async () => {
    const user = setup();
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    );
    await user.type(screen.getByLabelText('Search review'), 'lease');
    expect(rows()).toEqual(['entry-004', 'entry-009']);
    await user.click(screen.getByLabelText('Select visible entries'));
    await user.click(
      screen.getByRole('button', { name: /Apply to 2 selected/ }),
    );
    // Only the two visible lease entries changed; the hidden pick stays.
    expect(latest.entries.find((e) => e.id === 'entry-002')!.reviewed).toBe(
      false,
    );
    await user.clear(screen.getByLabelText('Search review'));
    expect(
      screen.getByRole('checkbox', { name: 'Select Weekly team planning' }),
    ).toBeChecked();
  });
});
