'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/cn';
import { TicketCard } from './TicketCard';
import type { BoardColumn } from './types';

interface Props {
  column: BoardColumn;
  projectKey: string;
  onOpenTicket: (ticketId: string) => void;
  onCreateTicket: (columnId: string) => void;
}

export function Column({ column, projectKey, onOpenTicket, onCreateTicket }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const overLimit =
    column.wipLimit !== null && column.wipLimit !== undefined && column.tickets.length > column.wipLimit;
  const atLimit =
    column.wipLimit !== null && column.wipLimit !== undefined && column.tickets.length >= column.wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-lg border border-bg-border bg-bg-surface/60',
        isOver && 'ring-2 ring-accent/40',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', categoryDot(column.category))} />
          <h3 className="text-sm font-medium text-text-primary">{column.name}</h3>
          <span className="rounded bg-bg-raised px-1.5 py-0.5 text-[10px] text-text-secondary">
            {column.tickets.length}
            {column.wipLimit ? ` / ${column.wipLimit}` : ''}
          </span>
          {overLimit ? (
            <span
              title="Over WIP limit"
              className="rounded bg-priority-urgent/20 px-1.5 py-0.5 text-[10px] text-priority-urgent"
            >
              over limit
            </span>
          ) : atLimit ? (
            <span
              title="At WIP limit"
              className="rounded bg-priority-high/15 px-1.5 py-0.5 text-[10px] text-priority-high"
            >
              at limit
            </span>
          ) : null}
        </div>
        <button
          onClick={() => onCreateTicket(column.id)}
          aria-label={`Add ticket to ${column.name}`}
          className="text-text-muted hover:text-text-primary"
          title="Add ticket"
        >
          ＋
        </button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={column.tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              projectKey={projectKey}
              onOpen={onOpenTicket}
            />
          ))}
        </SortableContext>
        {column.tickets.length === 0 ? (
          <div className="rounded-md border border-dashed border-bg-border px-3 py-6 text-center text-xs text-text-muted">
            Drop tickets here.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function categoryDot(category: string): string {
  if (category === 'todo') return 'bg-text-muted';
  if (category === 'in_progress') return 'bg-priority-medium';
  if (category === 'done') return 'bg-emerald-400';
  return 'bg-text-muted';
}
