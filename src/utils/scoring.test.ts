import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gradeQuestionAnswer,
  calculateAttemptScore,
  computeSinglePrePostMetrics,
  computeSummaryStats,
} from './scoring';
import { Question } from '../types/assessment';

const mockSingleChoiceQuestion: Question = {
  id: 'q-1',
  ownerId: 'u-1',
  authorName: 'Instruktur',
  organizationId: 'org-1',
  prompt: 'Organel sel yang berfungsi sebagai pusat respirasi seluler adalah...',
  questionType: 'single_choice',
  options: [
    { id: 'opt-a', label: 'A', text: 'Ribosom' },
    { id: 'opt-b', label: 'B', text: 'Mitokondria' },
  ],
  correctOptionIds: ['opt-b'],
  points: 20,
  explanation: 'Mitokondria menghasilkan ATP melalui fosforilasi oksidatif.',
  category: 'Biologi Sel',
  topic: 'Organel',
  difficulty: 'mudah',
  educationLevel: 'SMA/SMK/MA',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const mockNumericQuestion: Question = {
  id: 'q-num',
  ownerId: 'u-1',
  authorName: 'Instruktur',
  organizationId: 'org-1',
  prompt: 'Hitung nilai percepatan gravitasi rata-rata (m/s^2)',
  questionType: 'numeric',
  correctNumericValue: 9.8,
  numericTolerance: 0.05,
  points: 30,
  explanation: '9.8 m/s^2 dengan toleransi 0.05.',
  category: 'Fisika',
  topic: 'Mekanika',
  difficulty: 'sedang',
  educationLevel: 'SMA/SMK/MA',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const mockShortAnswerQuestion: Question = {
  id: 'q-short',
  ownerId: 'u-1',
  authorName: 'Instruktur',
  organizationId: 'org-1',
  prompt: 'Sebutkan protokol standar pengamanan lapisan transport web!',
  questionType: 'short_answer',
  correctShortAnswers: ['TLS', 'Transport Layer Security'],
  caseSensitive: false,
  points: 25,
  explanation: 'TLS mengamankan komunikasi HTTP menjadi HTTPS.',
  category: 'Jaringan',
  topic: 'Keamanan',
  difficulty: 'sedang',
  educationLevel: 'Perguruan Tinggi',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const mockEssayQuestion: Question = {
  id: 'q-essay',
  ownerId: 'u-1',
  authorName: 'Instruktur',
  organizationId: 'org-1',
  prompt: 'Jelaskan dampak siklus karbon terhadap pemanasan global!',
  questionType: 'essay',
  points: 25,
  explanation: 'Melibatkan peningkatan konsentrasi gas rumah kaca.',
  category: 'Lingkungan',
  topic: 'Iklim',
  difficulty: 'sulit',
  educationLevel: 'SMA/SMK/MA',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

test('gradeQuestionAnswer grades single choice, numeric tolerance, and normalized short answer accurately', () => {
  const res1 = gradeQuestionAnswer(mockSingleChoiceQuestion, {
    questionId: 'q-1',
    selectedOptionIds: ['opt-b'],
    savedAt: '2026-10-01T00:00:00Z',
  });
  assert.equal(res1.isCorrect, true);
  assert.equal(res1.awardedPoints, 20);

  const resNum = gradeQuestionAnswer(mockNumericQuestion, {
    questionId: 'q-num',
    numericAnswer: 9.83,
    savedAt: '2026-10-01T00:00:00Z',
  });
  assert.equal(resNum.isCorrect, true);
  assert.equal(resNum.awardedPoints, 30);

  const resShort = gradeQuestionAnswer(mockShortAnswerQuestion, {
    questionId: 'q-short',
    textAnswer: '  transport   layer security ',
    savedAt: '2026-10-01T00:00:00Z',
  });
  assert.equal(resShort.isCorrect, true);
  assert.equal(resShort.awardedPoints, 25);
});

test('calculateAttemptScore marks attempt as provisional until essay is graded manually', () => {
  const questions = [
    mockSingleChoiceQuestion,
    mockNumericQuestion,
    mockShortAnswerQuestion,
    mockEssayQuestion,
  ];
  const answers = {
    'q-1': { questionId: 'q-1', selectedOptionIds: ['opt-b'], savedAt: '2026-10-01T00:00:00Z' },
    'q-num': { questionId: 'q-num', numericAnswer: 9.8, savedAt: '2026-10-01T00:00:00Z' },
    'q-short': { questionId: 'q-short', textAnswer: 'TLS', savedAt: '2026-10-01T00:00:00Z' },
    'q-essay': { questionId: 'q-essay', textAnswer: 'Jawaban esai peserta...', savedAt: '2026-10-01T00:00:00Z' },
  };

  const beforeManual = calculateAttemptScore(questions, answers, {});
  assert.equal(beforeManual.isProvisional, true);
  assert.equal(beforeManual.objectivePoints, 75);
  assert.equal(beforeManual.finalScoreNormalized, 75);

  const afterManual = calculateAttemptScore(questions, answers, {
    'q-essay': {
      questionId: 'q-essay',
      awardedPoints: 20,
      feedback: 'Analisis sangat baik.',
      gradedBy: 'Instruktur',
      gradedAt: '2026-10-01T01:00:00Z',
    },
  });
  assert.equal(afterManual.isProvisional, false);
  assert.equal(afterManual.finalScoreNormalized, 95);
});

test('computeSinglePrePostMetrics handles division by zero when pretest is 0 and ceiling when pretest is 100', () => {
  const zeroPre = computeSinglePrePostMetrics(0, 80, 100);
  assert.equal(zeroPre.deltaScore, 80);
  assert.equal(zeroPre.relativeChangePct, null); // Must not divide by zero
  assert.equal(zeroPre.nGain, 0.8);
  assert.equal(zeroPre.nGainCategory, 'Tinggi');

  const maxPre = computeSinglePrePostMetrics(100, 100, 100);
  assert.equal(maxPre.deltaScore, 0);
  assert.equal(maxPre.nGain, null); // Cannot compute N-Gain when preScore == maxScore
  assert.equal(maxPre.nGainCategory, 'Tidak Dapat Dihitung');
});

test('computeSummaryStats computes mean, median, and pass rate accurately', () => {
  const stats = computeSummaryStats([60, 70, 80, 90, 100], 70);
  assert.equal(stats.count, 5);
  assert.equal(stats.mean, 80);
  assert.equal(stats.median, 80);
  assert.equal(stats.passRatePct, 80);
});

test('buildExcelTemplateBuffer creates multi-column .xlsx workbook where each column is separated', async () => {
  const {
    buildExcelTemplateBuffer,
    parseExcelBufferToRows,
    parseDelimitedTextToRows,
    DEFAULT_TEMPLATE_ROWS,
  } = await import('./excelTemplate');

  const buffer = buildExcelTemplateBuffer(DEFAULT_TEMPLATE_ROWS);
  const parsedRows = parseExcelBufferToRows(buffer);

  assert.equal(parsedRows.length, DEFAULT_TEMPLATE_ROWS.length);
  assert.equal(parsedRows[0].prompt, DEFAULT_TEMPLATE_ROWS[0].prompt);
  assert.equal(parsedRows[0].questionType, 'single_choice');
  assert.equal(parsedRows[0].optionA, 'Oksigen (O2)');
  assert.equal(parsedRows[0].optionB, 'Nitrogen (N2)');
  assert.equal(parsedRows[0].optionC, 'Karbon Monoksida (CO)');
  assert.equal(parsedRows[0].optionD, 'Hidrogen (H2)');
  assert.equal(parsedRows[0].correctAnswer, 'A');
  assert.equal(parsedRows[0].points, 10);

  // Also verify semicolon-separated CSV (Excel Indonesian locale)
  const semiRows = parseDelimitedTextToRows(
    'sep=;\r\nprompt;questionType;optionA;optionB;optionC;optionD;correctAnswer;points;explanation\r\nSoal Uji Kolom?;single_choice;Opsi 1;Opsi 2;Opsi 3;Opsi 4;B;15;Penjelasan'
  );
  assert.equal(semiRows.length, 1);
  assert.equal(semiRows[0].optionB, 'Opsi 2');
  assert.equal(semiRows[0].correctAnswer, 'B');
  assert.equal(semiRows[0].points, 15);
});

