/**
 * Activity log helpers. See TechSpec §7.5.
 *
 * Every state change writes an immutable activity_events row.
 */

import { prisma } from './db';
import { newId } from './ids';

export type ActivityType =
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_archived'
  | 'status_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'label_added'
  | 'label_removed'
  | 'comment_added'
  | 'attachment_uploaded';

interface RecordActivityOpts {
  ticketId: string;
  actorId: string | null;
  type: ActivityType;
  payload?: Record<string, unknown>;
  tx?: typeof prisma;
}

export async function recordActivity(opts: RecordActivityOpts) {
  const client = opts.tx ?? prisma;
  return client.activityEvent.create({
    data: {
      id: newId('evt'),
      ticketId: opts.ticketId,
      actorId: opts.actorId,
      eventType: opts.type,
      payload: JSON.stringify(opts.payload ?? {}),
    },
  });
}
