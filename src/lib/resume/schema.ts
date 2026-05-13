import { z } from 'zod';

// --- Locked (factual; AI must never modify) ----------------------------

// Note: all fields are required strings (empty '' is valid). Avoiding
// `.optional().default()` here keeps the inferred TS type stable so it
// flows cleanly through our generic parseJson<T>(schema: ZodSchema<T>)
// helper, which ties input and output types together.

export const LockedContactSchema = z.object({
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  github: z.string(),
  website: z.string(),
});

export const LockedEducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startYear: z.string(),
  endYear: z.string(),
  gpa: z.string(),
});

export const LockedExperienceFactsSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export const LockedSchema = z.object({
  name: z.string(),
  contact: LockedContactSchema,
  education: z.array(LockedEducationSchema),
  experienceFacts: z.array(LockedExperienceFactsSchema),
});

// --- Editable (AI may rewrite) -----------------------------------------

export const EditableExperienceSchema = z.object({
  id: z.string(),
  bullets: z.array(z.string()),
});

export const EditableProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
  techStack: z.array(z.string()),
  url: z.string().optional(),
});

export const SkillCategorySchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

// Accepts both new { category, items[] } objects and legacy "Category: item1, item2"
// strings so existing DB records migrate transparently on read.
// z.array(z.any()) avoids union-input-type bleed into z.infer; the transform
// return type explicitly pins the output to SkillCategory[].
const skillsField = z.array(z.any()).transform((arr): SkillCategory[] =>
  arr.flatMap((s: unknown) => {
    if (typeof s === 'string') {
      const idx = s.indexOf(':');
      if (idx === -1) return s ? [{ category: s, items: [] }] : [];
      const category = s.slice(0, idx).trim();
      const items = s.slice(idx + 1).split(',').map((i) => i.trim()).filter(Boolean);
      return category ? [{ category, items }] : [];
    }
    if (s && typeof s === 'object' && 'category' in s) {
      return [s as SkillCategory];
    }
    return [];
  }),
);

export const EditableSchema = z.object({
  summary: z.string(),
  skills: skillsField,
  experience: z.array(EditableExperienceSchema),
  projects: z.array(EditableProjectSchema),
});

export const ResumeSchema = z.object({
  profileId: z.string(),
  locked: LockedSchema,
  editable: EditableSchema,
});

export type LockedResume = z.infer<typeof LockedSchema>;
export type EditableResume = z.infer<typeof EditableSchema>;
export type Resume = z.infer<typeof ResumeSchema>;
export type EditableExperience = z.infer<typeof EditableExperienceSchema>;
export type EditableProject = z.infer<typeof EditableProjectSchema>;
