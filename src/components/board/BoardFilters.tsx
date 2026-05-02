'use client';

import type { LabelDef, Member, Priority } from './types';

export interface Filters {
  assignee: string | null;
  priority: string | null;
  label: string | null;
  q: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  members: Member[];
  labels: LabelDef[];
  currentUserId: string;
}

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low', 'lowest'];

export function BoardFilters({ filters, onChange, members, labels, currentUserId }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const hasActive = filters.assignee || filters.priority || filters.label || filters.q;

  return (
    <div className="flex items-center gap-2">
      <input
        className="input w-48 py-1 text-xs"
        placeholder="Search title…"
        value={filters.q}
        onChange={(e) => update({ q: e.target.value })}
      />
      <select
        className="input w-32 py-1 text-xs"
        value={filters.assignee ?? ''}
        onChange={(e) => update({ assignee: e.target.value || null })}
      >
        <option value="">All assignees</option>
        <option value={currentUserId}>Me</option>
        {members
          .filter((m) => m.id !== currentUserId)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
      </select>
      <select
        className="input w-32 py-1 text-xs"
        value={filters.priority ?? ''}
        onChange={(e) => update({ priority: e.target.value || null })}
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        className="input w-32 py-1 text-xs"
        value={filters.label ?? ''}
        onChange={(e) => update({ label: e.target.value || null })}
      >
        <option value="">Any label</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {hasActive ? (
        <button
          className="btn btn-ghost text-xs"
          onClick={() => onChange({ assignee: null, priority: null, label: null, q: '' })}
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
