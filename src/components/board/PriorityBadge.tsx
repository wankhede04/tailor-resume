import { cn } from '@/lib/cn';
import type { Priority } from './types';

const META: Record<Priority, { label: string; symbol: string; className: string }> = {
  urgent: { label: 'Urgent', symbol: '⏶', className: 'bg-priority-urgent/15 text-priority-urgent' },
  high: { label: 'High', symbol: '↑', className: 'bg-priority-high/15 text-priority-high' },
  medium: { label: 'Medium', symbol: '–', className: 'bg-priority-medium/15 text-priority-medium' },
  low: { label: 'Low', symbol: '↓', className: 'bg-priority-low/15 text-priority-low' },
  lowest: { label: 'Lowest', symbol: '⏷', className: 'bg-priority-lowest/15 text-priority-lowest' },
};

export function PriorityBadge({
  priority,
  className,
  showLabel = false,
}: {
  priority: Priority;
  className?: string;
  showLabel?: boolean;
}) {
  const m = META[priority];
  return (
    <span
      title={m.label}
      className={cn('priority-pill', m.className, className)}
    >
      <span aria-hidden>{m.symbol}</span>
      {showLabel ? <span>{m.label}</span> : null}
    </span>
  );
}
