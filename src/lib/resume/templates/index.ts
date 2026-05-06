import type { ComponentType } from 'react';
import type { ResumePdfProps } from '../pdfDocument';
import { TemplateA } from './TemplateA';
import { TemplateB } from './TemplateB';
import { TemplateC } from './TemplateC';
import { TemplateD } from './TemplateD';
import { TemplateE } from './TemplateE';

export type TemplateId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  description: string;
}

export const TEMPLATE_LIST: TemplateMeta[] = [
  { id: 'A', label: 'Clean',    description: 'Minimal single-column, blue links only' },
  { id: 'B', label: 'Classic',  description: 'Formal corporate, no colour accents' },
  { id: 'C', label: 'Modern',   description: 'Blue accent throughout, grid skills' },
  { id: 'D', label: 'Formal',   description: 'Staff-level traditional with subtitle' },
  { id: 'E', label: 'Balanced', description: 'Modern professional, works across industries' },
];

export const DEFAULT_TEMPLATE_ID: TemplateId = 'A';

export type TemplateComponent = ComponentType<ResumePdfProps>;

export function isValidTemplateId(v: unknown): v is TemplateId {
  return v === 'A' || v === 'B' || v === 'C' || v === 'D' || v === 'E';
}

export function resolveTemplate(id: TemplateId): TemplateComponent {
  switch (id) {
    case 'B': return TemplateB;
    case 'C': return TemplateC;
    case 'D': return TemplateD;
    case 'E': return TemplateE;
    default:  return TemplateA;
  }
}
