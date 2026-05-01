import { z } from 'zod';
import { ok, fail, parseJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireProjectAccess } from '@/lib/permissions';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { newId } from '@/lib/ids';
import { recordActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  body: z.string().min(1).max(10000),
  parentId: z.string().optional(),
});

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ctx.params.id },
      select: { projectId: true },
    });
    if (!ticket) throw new ApiError(ErrorCodes.TICKET_NOT_FOUND, 'Ticket not found');
    await requireProjectAccess(user.id, ticket.projectId, 'viewer');

    const comments = await prisma.comment.findMany({
      where: { ticketId: ctx.params.id },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });
    return ok({ data: comments });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ctx.params.id },
      select: { projectId: true },
    });
    if (!ticket) throw new ApiError(ErrorCodes.TICKET_NOT_FOUND, 'Ticket not found');
    await requireProjectAccess(user.id, ticket.projectId, 'member');

    const body = await parseJson(req, schema);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          id: newId('cmt'),
          ticketId: ctx.params.id,
          parentId: body.parentId ?? null,
          authorId: user.id,
          body: body.body,
        },
        include: { author: true },
      });
      await recordActivity({
        ticketId: ctx.params.id,
        actorId: user.id,
        type: 'comment_added',
        payload: { commentId: c.id },
        tx: tx as unknown as typeof prisma,
      });
      return c;
    });
    return ok({ data: created }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
