import Anthropic from '@anthropic-ai/sdk';
import { EditableSchema, type EditableResume, type LockedResume } from './schema';

// Default to Sonnet 4.6 (Plan §7 — Sonnet model). Override via env.
const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Configure it in your environment to enable JD tailoring.',
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

const SYSTEM_PROMPT = `You are an expert resume editor. Your job is to tailor the EDITABLE sections of a resume so they better match a target job description, while preserving accuracy.

CRITICAL RULES:
1. The LOCKED section contains factual data (name, contact, education, job titles, companies, dates). You MUST NOT change or invent any of these facts.
2. You may ONLY rewrite content inside the editable section: summary, skills, experience bullets, project bullets/description.
3. The candidate's experience IDs map editable bullets to locked job titles/companies. Keep the same ids and roughly the same number of bullets per role (within 1).
4. Do not invent technologies, certifications, or accomplishments that aren't supported by the existing bullets. You may rephrase, reorder, sharpen verbs, and emphasize JD-relevant aspects of the SAME work.
5. Keep bullets concise (one line each, ideally under 22 words). Lead with strong verbs. Quantify where the original did.
6. Skills array: reorder and trim to highlight JD-relevant items. You may drop irrelevant skills, but do NOT add new skills the candidate hasn't shown.
7. Summary: rewrite in first-third-person (no "I"), 2-3 sentences, focused on JD-relevant strengths the candidate already demonstrates.
8. Output MUST be a valid editable resume JSON. Use the submit_tailored_resume tool to return your result.`;

const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'bullets'],
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          techStack: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'name', 'description', 'bullets', 'techStack'],
      },
    },
  },
  required: ['summary', 'skills', 'experience', 'projects'],
} as const;

export interface TailorInput {
  locked: LockedResume;
  editable: EditableResume;
  jobDescription: string;
}

export async function tailorResume(input: TailorInput): Promise<EditableResume> {
  const userMessage = [
    `LOCKED FACTS (read-only context, do not modify):`,
    '```json',
    JSON.stringify(input.locked, null, 2),
    '```',
    '',
    `CURRENT EDITABLE SECTION (this is what you rewrite):`,
    '```json',
    JSON.stringify(input.editable, null, 2),
    '```',
    '',
    `TARGET JOB DESCRIPTION:`,
    '"""',
    input.jobDescription.trim(),
    '"""',
    '',
    'Tailor the editable section to match the JD per the rules in your instructions, then call the submit_tailored_resume tool with your result.',
  ].join('\n');

  const response = await client().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: 'submit_tailored_resume',
        description:
          'Submit the tailored editable resume. Must contain summary, skills, experience (with same ids as input), and projects (with same ids as input).',
        input_schema: TOOL_INPUT_SCHEMA as unknown as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_tailored_resume' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Claude did not return a tool_use block');
  }

  const parsed = EditableSchema.parse(toolUse.input);

  // Extra invariant: experience ids must match the input set.
  const inputIds = new Set(input.editable.experience.map((e) => e.id));
  const outputIds = new Set(parsed.experience.map((e) => e.id));
  if (inputIds.size !== outputIds.size || [...inputIds].some((id) => !outputIds.has(id))) {
    throw new Error('Tailored output experience ids do not match the input.');
  }

  return parsed;
}
