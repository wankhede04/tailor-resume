import type { BoardSnapshot, BoardColumn, BoardTicket } from '@/lib/board';

export type { BoardSnapshot, BoardColumn, BoardTicket };

export interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface LabelDef {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export type Priority = 'lowest' | 'low' | 'medium' | 'high' | 'urgent';
