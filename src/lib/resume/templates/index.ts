import type { ComponentType } from 'react';
import type { ResumePdfProps } from '../pdfDocument';

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

// Synchronous resolver used inside the Node.js PDF route (all templates are
// bundled in the same chunk so dynamic import is unnecessary).
export function resolveTemplate(id: TemplateId): TemplateComponent {
  switch (id) {
    case 'B': return require('./TemplateB').TemplateB as TemplateComponent;
    case 'C': return require('./TemplateC').TemplateC as TemplateComponent;
    case 'D': return require('./TemplateD').TemplateD as TemplateComponent;
    case 'E': return require('./TemplateE').TemplateE as TemplateComponent;
    default:  return require('./TemplateA').TemplateA as TemplateComponent;
  }
}
