/**
 * JSON contract for GrammarRule.exerciseTemplates.
 *
 * Only the 3 exercise types actually implemented by the runtime today
 * (see MicroLessonExercise in ../ai/ai.types.ts) are supported. 'reorder'
 * or any other type is deliberately excluded — see
 * english-flow/docs/content-pedagogy/grammar-prisma-model-proposal.md
 * "Exercise JSON contract" for the accepted design this file implements.
 */

export const GRAMMAR_EXERCISE_SCHEMA_VERSION = '1.0' as const;

export type SupportedGrammarExerciseType =
  'fill_blank' | 'choice' | 'correct_sentence';

export interface GrammarFillBlankExercise {
  id: string;
  type: 'fill_blank';
  prompt: string;
  answer: string;
}

export interface GrammarChoiceExercise {
  id: string;
  type: 'choice';
  prompt: string;
  options: string[];
  answer: string;
}

export interface GrammarCorrectSentenceExercise {
  id: string;
  type: 'correct_sentence';
  prompt: string;
  answer: string;
}

export type GrammarExerciseTemplate =
  | GrammarFillBlankExercise
  | GrammarChoiceExercise
  | GrammarCorrectSentenceExercise;

export interface GrammarExerciseTemplateSet {
  exerciseSchemaVersion: typeof GRAMMAR_EXERCISE_SCHEMA_VERSION;
  exercises: GrammarExerciseTemplate[];
}

const SUPPORTED_TYPES: readonly string[] = [
  'fill_blank',
  'choice',
  'correct_sentence',
];

/**
 * Deterministic structural validation — no library, matches the existing
 * isValidLessonContent() hand-rolled pattern (../content/lesson-content.ts).
 * Rejects unknown/unsupported exercise types (including 'reorder')
 * explicitly rather than silently ignoring them.
 */
export function isValidGrammarExerciseTemplateSet(
  value: unknown,
): value is GrammarExerciseTemplateSet {
  if (!value || typeof value !== 'object') return false;
  const v = value as GrammarExerciseTemplateSet;
  if (v.exerciseSchemaVersion !== GRAMMAR_EXERCISE_SCHEMA_VERSION) return false;
  if (!Array.isArray(v.exercises) || v.exercises.length === 0) return false;
  return v.exercises.every(isValidGrammarExerciseTemplate);
}

export function isValidGrammarExerciseTemplate(
  value: unknown,
): value is GrammarExerciseTemplate {
  if (!value || typeof value !== 'object') return false;
  const t = value as GrammarExerciseTemplate;
  if (typeof t.id !== 'string' || t.id.length === 0) return false;
  if (typeof t.type !== 'string' || !SUPPORTED_TYPES.includes(t.type))
    return false;
  if (typeof t.prompt !== 'string' || t.prompt.length === 0) return false;
  if (typeof t.answer !== 'string' || t.answer.length === 0) return false;
  if (t.type === 'choice') {
    const c = t as GrammarChoiceExercise;
    if (!Array.isArray(c.options) || c.options.length < 2) return false;
    if (!c.options.every((o) => typeof o === 'string' && o.length > 0))
      return false;
    if (!c.options.includes(c.answer)) return false;
  }
  return true;
}

/** Every unsupported/unknown type actually present, for precise rejection messages. */
export function findUnsupportedExerciseTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const v = value as { exercises?: unknown };
  if (!Array.isArray(v.exercises)) return [];
  const unsupported = new Set<string>();
  for (const ex of v.exercises) {
    const type =
      ex && typeof ex === 'object'
        ? (ex as { type?: unknown }).type
        : undefined;
    if (typeof type !== 'string' || !SUPPORTED_TYPES.includes(type)) {
      unsupported.add(typeof type === 'string' ? type : String(type));
    }
  }
  return [...unsupported];
}
