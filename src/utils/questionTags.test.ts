import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addQuestionTag,
  collectTopicTagsWithCounts,
  filterQuestionsByTagsAndCriteria,
  getEffectiveQuestionTags,
  MAX_QUESTION_TAGS,
  normalizeQuestionTag,
  removeQuestionTag,
} from './questionTags';
import { Question } from '../types/assessment';

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    ownerId: 'u-1',
    authorName: 'Instruktur A',
    organizationId: 'org-1',
    prompt: 'Apa fungsi mitokondria dalam respirasi seluler?',
    questionType: 'single_choice',
    points: 10,
    explanation: 'Penghasil ATP.',
    category: 'Biologi Molekuler',
    topic: 'Metabolisme & Respirasi Sel',
    tags: ['Metabolisme & Respirasi Sel', 'Biologi Molekuler', 'ATP & Energi'],
    difficulty: 'mudah',
    educationLevel: 'SMA/SMK/MA',
    status: 'published',
    isDraft: false,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'q-2',
    ownerId: 'u-1',
    authorName: 'Instruktur A',
    organizationId: 'org-1',
    prompt: 'Jelaskan mekanisme penyuntingan gen menggunakan CRISPR-Cas9.',
    questionType: 'essay',
    points: 20,
    explanation: 'CRISPR memotong DNA target.',
    category: 'Bioteknologi',
    topic: 'Rekayasa Genetika',
    tags: ['Rekayasa Genetika', 'CRISPR', 'HOTS'],
    difficulty: 'sulit',
    educationLevel: 'Perguruan Tinggi',
    status: 'published',
    isDraft: false,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  },
  {
    id: 'q-3',
    ownerId: 'u-1',
    authorName: 'Instruktur A',
    organizationId: 'org-1',
    prompt: 'Draf soal tentang fotosintesis.',
    questionType: 'true_false',
    points: 10,
    explanation: 'Reaksi terang.',
    category: 'Biologi Molekuler',
    topic: 'Fotosintesis',
    difficulty: 'sedang',
    educationLevel: 'SMA/SMK/MA',
    status: 'draft',
    isDraft: true,
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T00:00:00Z',
  },
];

test('normalizeQuestionTag strips leading hashes and extra whitespace', () => {
  assert.equal(normalizeQuestionTag('  #Metabolisme   Sel  '), 'Metabolisme Sel');
  assert.equal(normalizeQuestionTag('###HOTS'), 'HOTS');
});

test('addQuestionTag and removeQuestionTag manage deduplicated tags up to MAX_QUESTION_TAGS', () => {
  let tags = addQuestionTag(['Biologi'], 'Genetika, HOTS, biologi');
  assert.deepEqual(tags, ['Biologi', 'Genetika', 'HOTS']);

  tags = removeQuestionTag(tags, 'genetika');
  assert.deepEqual(tags, ['Biologi', 'HOTS']);

  const manyTags = Array.from({ length: 15 }, (_, i) => `Tag-${i + 1}`).join(',');
  const capped = addQuestionTag([], manyTags);
  assert.equal(capped.length, MAX_QUESTION_TAGS);
});

test('getEffectiveQuestionTags combines explicit tags with topic and category', () => {
  const effective = getEffectiveQuestionTags(SAMPLE_QUESTIONS[2]);
  assert.deepEqual(effective, ['Fotosintesis', 'Biologi Molekuler']);
});

test('collectTopicTagsWithCounts aggregates tag frequencies across questions', () => {
  const publishedOnly = SAMPLE_QUESTIONS.filter((q) => !q.isDraft);
  const counts = collectTopicTagsWithCounts(publishedOnly);
  const bioTag = counts.find((c) => c.tag === 'Biologi Molekuler');
  const crisprTag = counts.find((c) => c.tag === 'CRISPR');
  assert.equal(bioTag?.count, 1);
  assert.equal(crisprTag?.count, 1);
});

test('filterQuestionsByTagsAndCriteria filters by topic tags and difficulty level', () => {
  const byTopicTag = filterQuestionsByTagsAndCriteria(SAMPLE_QUESTIONS, {
    statusFilter: 'published',
    selectedTags: ['CRISPR'],
  });
  assert.equal(byTopicTag.length, 1);
  assert.equal(byTopicTag[0].id, 'q-2');

  const byDifficulty = filterQuestionsByTagsAndCriteria(SAMPLE_QUESTIONS, {
    statusFilter: 'published',
    difficultyFilter: 'mudah',
  });
  assert.equal(byDifficulty.length, 1);
  assert.equal(byDifficulty[0].id, 'q-1');

  const byCombined = filterQuestionsByTagsAndCriteria(SAMPLE_QUESTIONS, {
    statusFilter: 'published',
    difficultyFilter: 'sulit',
    selectedTags: ['HOTS', 'Rekayasa Genetika'],
  });
  assert.equal(byCombined.length, 1);
  assert.equal(byCombined[0].id, 'q-2');
});
