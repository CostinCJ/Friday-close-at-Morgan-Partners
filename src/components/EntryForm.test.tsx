import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Entry } from '../model';
import { EntryForm } from './EntryForm';

const clients = [{ id: 'internal', name: 'Firm · Internal', color: '#52735a' }];
const planning: Entry = {
  id: 'entry-002',
  date: '2026-09-28',
  minutes: 45,
  clientId: 'internal',
  billable: false,
  description: 'Weekly team planning',
  employee: 'Alex Morgan',
  reviewed: true,
};

function edit(entry: Entry) {
  const onSave = vi.fn();
  render(
    <EntryForm
      entry={entry}
      clients={clients}
      onSave={onSave}
      onClose={() => {}}
    />,
  );
  return { onSave, user: userEvent.setup() };
}

describe('editing an existing entry', () => {
  it('shows the saved billability instead of defaulting to billable', () => {
    edit(planning);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('changing only the description preserves every other value', async () => {
    const { onSave, user } = edit(planning);
    const description = screen.getByLabelText(/Description/);
    await user.clear(description);
    await user.type(description, 'Weekly team planning and priorities');
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    expect(onSave.mock.calls[0][0]).toEqual({
      ...planning,
      reviewed: undefined,
      description: 'Weekly team planning and priorities',
    });
  });
  it('an untouched save returns the stored values unchanged', async () => {
    const padded = { ...planning, description: ' Weekly team planning ' };
    const { onSave, user } = edit(padded);
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    const { reviewed: _, ...rest } = padded;
    expect(onSave.mock.calls[0][0]).toEqual(rest);
  });
  it('new entries still default to billable', () => {
    render(
      <EntryForm clients={clients} onSave={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
