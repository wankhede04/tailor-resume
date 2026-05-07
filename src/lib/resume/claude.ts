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
6. Skills: the skills field is an array of { category, items[] } objects. Preserve every category label exactly as given. Within each category, reorder and trim items to highlight JD-relevant ones. You may drop irrelevant items but do NOT add new items or invent new categories.
7. Summary: rewrite in first-third-person (no "I"), 2-3 sentences, focused on JD-relevant strengths the candidate already demonstrates.
8. Output MUST be a valid editable resume JSON. Use the submit_tailored_resume tool to return your result.
9. WRITING STYLE — avoid AI writing patterns in every text field:
   - No filler words: "pivotal", "testament", "underscores", "highlights", "showcasing", "fostering", "enduring", "vibrant", "groundbreaking", "seamless", "robust", "leverage", "delve", "tapestry", "landscape" (abstract)
   - Use simple "is/are/has" — not "serves as", "stands as", "marks a", "represents a"
   - No em dashes (—); use commas or periods
   - No "not only … but also" or similar negative parallelisms
   - No padding rule-of-three lists where two items suffice
   - No vague attributions ("experts say", "industry observers")
   - No filler phrases: replace "in order to" → "to", "due to the fact that" → "because"
   - Vary sentence length; short punchy sentences are fine next to longer ones
   - Be specific and concrete — numbers, tools, and outcomes beat adjectives`;

const HUMANIZER_SYSTEM_PROMPT = `You are a writing editor that removes AI writing patterns to make text sound natural and human. Apply every rule below, then output ONLY the rewritten text with no commentary.

RULES:
- Remove significance inflation: pivotal, testament, underscores/highlights/showcases, enduring, fostering, vibrant, groundbreaking, nestled, breathtaking, robust, leverage, delve, tapestry, landscape (abstract)
- Remove promotional/puffery language and generic positive conclusions
- Replace "serves as / stands as / marks a / represents a" with "is / are / has"
- Remove em dashes (—); use commas, colons, or periods instead
- Remove "not only … but also" and similar negative parallelisms
- Remove rule-of-three padding where two items suffice
- Remove vague attributions ("experts argue", "observers note", "industry reports")
- Remove superficial -ing tack-ons that add fake depth (highlighting that…, ensuring that…, reflecting that…)
- Replace filler phrases: "in order to" → "to", "due to the fact that" → "because", "at this point in time" → "now", "it is important to note that" → omit or state directly
- Remove excessive hedging ("could potentially possibly be argued")
- Remove sycophantic openers ("Great question!", "Certainly!", "I hope this helps")
- Remove knowledge-cutoff disclaimers ("as of my last update", "based on available information")
- Vary sentence length naturally — mix short and long
- Use specific details over vague claims; numbers and outcomes beat adjectives
- Add personality: a real human voice, not a press release`;

const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['category', 'items'],
      },
    },
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

export interface CoverLetterInput {
  locked: LockedResume;
  editable: EditableResume;
  jobTitle: string;
  company: string;
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

async function humanizeText(text: string): Promise<string> {
  const response = await client().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    system: HUMANIZER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  });
  const block = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text');
  return block ? block.text.trim() : text;
}

export async function generateCoverLetter(input: CoverLetterInput): Promise<string> {
  const experienceLines = input.locked.experienceFacts.flatMap((f) => {
    const exp = input.editable.experience.find((e) => e.id === f.id);
    const bullets = exp?.bullets.map((b) => `    - ${b}`).join('\n') ?? '';
    return [`  ${f.title} at ${f.company} (${f.startDate} – ${f.endDate ?? 'Present'})`, bullets].filter(Boolean);
  });

  const prompt = [
    `Write a professional cover letter body for the following candidate applying to the role below.`,
    ``,
    `CANDIDATE:`,
    `Name: ${input.locked.name}`,
    `Summary: ${input.editable.summary}`,
    `Skills: ${input.editable.skills.map((s) => `${s.category}: ${s.items.join(', ')}`).join('; ')}`,
    `Experience:`,
    ...experienceLines,
    ``,
    `TARGET ROLE:`,
    `Job Title: ${input.jobTitle}`,
    `Company: ${input.company}`,
    ``,
    `JOB DESCRIPTION:`,
    input.jobDescription.trim(),
    ``,
    `INSTRUCTIONS:`,
    `- Write 3–4 concise paragraphs (no salutation or sign-off, just the body).`,
    `- Be specific to this role and company. Reference concrete achievements from the candidate's experience.`,
    `- Do not invent facts, technologies, or roles not present above.`,
    `- Keep it under 350 words.`,
  ].join('\n');

  const response = await client().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text');
  if (!textBlock) throw new Error('Claude did not return text for cover letter');
  return humanizeText(textBlock.text.trim());
}
