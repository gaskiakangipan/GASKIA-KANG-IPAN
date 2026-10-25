import { DifficultyLevel, Question } from '../types/assessment';

export const MAX_QUESTION_TAGS = 10;
export const MAX_TAG_LENGTH = 50;

export interface DifficultyTagMeta {
  value: DifficultyLevel;
  label: string;
  shortLabel: string;
  cognitiveLevel: string;
  badgeClass: string;
  activeButtonClass: string;
}

export const DIFFICULTY_TAG_CONFIG: Record<DifficultyLevel, DifficultyTagMeta> = {
  mudah: {
    value: 'mudah',
    label: 'Mudah (C1–C2 · Dasar)',
    shortLabel: 'Mudah',
    cognitiveLevel: 'C1–C2',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeButtonClass: 'bg-emerald-600 text-white border-emerald-600',
  },
  sedang: {
    value: 'sedang',
    label: 'Sedang (C3–C4 · Aplikasi)',
    shortLabel: 'Sedang',
    cognitiveLevel: 'C3–C4',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    activeButtonClass: 'bg-amber-600 text-white border-amber-600',
  },
  sulit: {
    value: 'sulit',
    label: 'Sulit / HOTS (C5–C6 · Analisis)',
    shortLabel: 'Sulit',
    cognitiveLevel: 'C5–C6',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    activeButtonClass: 'bg-rose-600 text-white border-rose-600',
  },
};

export const PRESET_TOPIC_TAGS: string[] = [
  'Metabolisme & Respirasi Sel',
  'Genetika & Replikasi DNA',
  'Fotosintesis',
  'Sintesis Protein',
  'Genetika Populasi',
  'Struktur Organel',
  'Enzim & Kinetika',
  'Keamanan Informasi',
  'Evaluasi Kinerja',
  'Literasi Sains',
  'Numerasi & Statistika',
  'HOTS',
];

/**
 * Normalizes a raw tag string by trimming whitespace, stripping leading '#',
 * collapsing internal whitespace, and clamping to MAX_TAG_LENGTH.
 */
export function normalizeQuestionTag(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TAG_LENGTH);
}

/**
 * Deduplicates an array of tags case-insensitively while preserving the first seen casing,
 * bounded to MAX_QUESTION_TAGS.
 */
export function sanitizeQuestionTags(rawTags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawTags) {
    const cleaned = normalizeQuestionTag(item);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
      if (result.length >= MAX_QUESTION_TAGS) break;
    }
  }

  return result;
}

/**
 * Adds a new tag (or comma-separated tags) to an existing tag list.
 */
export function addQuestionTag(existingTags: string[], rawInput: string): string[] {
  const parts = rawInput
    .split(',')
    .map((p) => normalizeQuestionTag(p))
    .filter(Boolean);
  if (parts.length === 0) return sanitizeQuestionTags(existingTags);
  return sanitizeQuestionTags([...existingTags, ...parts]);
}

/**
 * Removes a tag from the tag list (case-insensitive match).
 */
export function removeQuestionTag(existingTags: string[], tagToRemove: string): string[] {
  const targetKey = normalizeQuestionTag(tagToRemove).toLowerCase();
  return sanitizeQuestionTags(
    existingTags.filter((t) => normalizeQuestionTag(t).toLowerCase() !== targetKey)
  );
}

/**
 * Returns the effective topic/category tags for a question.
 * Ensures that even legacy or seed questions without an explicit `tags` array
 * expose their `topic` and `category` as filterable tags.
 */
export function getEffectiveQuestionTags(
  q: Pick<Question, 'tags' | 'topic' | 'category'>
): string[] {
  const explicit = Array.isArray(q.tags) ? q.tags : [];
  const combined = [
    ...explicit,
    ...(q.topic ? [q.topic] : []),
    ...(q.category ? [q.category] : []),
  ];
  return sanitizeQuestionTags(combined);
}

/**
 * Aggregates all unique topic/category tags across a set of questions with their counts.
 */
export function collectTopicTagsWithCounts(
  questions: Pick<Question, 'tags' | 'topic' | 'category'>[]
): { tag: string; count: number }[] {
  const map = new Map<string, { display: string; count: number }>();

  for (const q of questions) {
    const tags = getEffectiveQuestionTags(q);
    for (const t of tags) {
      const key = t.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { display: t, count: 1 });
      }
    }
  }

  return Array.from(map.values())
    .map((v) => ({ tag: v.display, count: v.count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export interface QuestionBankFilterCriteria {
  showArchived?: boolean;
  statusFilter?: 'published' | 'draft' | 'all';
  typeFilter?: string;
  difficultyFilter?: string;
  selectedTags?: string[];
  queryText?: string;
}

/**
 * Pure function to filter questions in the Question Bank list view by
 * status, question type, difficulty level tag, topic/category tags, and search query.
 */
export function filterQuestionsByTagsAndCriteria(
  questions: Question[],
  criteria: QuestionBankFilterCriteria
): Question[] {
  const {
    showArchived = false,
    statusFilter = 'published',
    typeFilter = 'all',
    difficultyFilter = 'all',
    selectedTags = [],
    queryText = '',
  } = criteria;

  const normalizedQuery = queryText.trim().toLowerCase();
  const normalizedSelectedTags = selectedTags
    .map((t) => normalizeQuestionTag(t).toLowerCase())
    .filter(Boolean);

  return questions.filter((q) => {
    if (Boolean(q.isArchived) !== showArchived) return false;

    const isQDraft = Boolean(q.isDraft || q.status === 'draft');
    if (statusFilter === 'published' && isQDraft) return false;
    if (statusFilter === 'draft' && !isQDraft) return false;

    if (typeFilter !== 'all' && q.questionType !== typeFilter) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;

    const effectiveTags = getEffectiveQuestionTags(q);
    const effectiveTagKeys = effectiveTags.map((t) => t.toLowerCase());

    if (normalizedSelectedTags.length > 0) {
      const matchesAllSelectedTags = normalizedSelectedTags.every((selTag) =>
        effectiveTagKeys.includes(selTag)
      );
      if (!matchesAllSelectedTags) return false;
    }

    if (normalizedQuery) {
      const promptMatch = q.prompt.toLowerCase().includes(normalizedQuery);
      const categoryMatch = q.category.toLowerCase().includes(normalizedQuery);
      const topicMatch = q.topic.toLowerCase().includes(normalizedQuery);
      const difficultyMatch = q.difficulty.toLowerCase().includes(normalizedQuery);
      const tagMatch = effectiveTagKeys.some((t) => t.includes(normalizedQuery));
      if (!promptMatch && !categoryMatch && !topicMatch && !difficultyMatch && !tagMatch) {
        return false;
      }
    }

    return true;
  });
}
