import {
  AttemptAnswer,
  AssessmentAttempt,
  ManualGradeRecord,
  Question,
} from '../types/assessment';

export interface QuestionGradeResult {
  questionId: string;
  awardedPoints: number;
  maxPoints: number;
  isCorrect: boolean;
  isBlank: boolean;
  requiresManualGrading: boolean;
  isManuallyGraded: boolean;
}

export function normalizeShortText(text: string, caseSensitive = false): string {
  const collapsed = text.trim().replace(/\s+/g, ' ');
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function gradeQuestionAnswer(
  question: Question,
  answer?: AttemptAnswer,
  manualGrade?: ManualGradeRecord
): QuestionGradeResult {
  const maxPoints = question.points;

  if (question.questionType === 'essay') {
    const hasText = Boolean(answer?.textAnswer && answer.textAnswer.trim().length > 0);
    if (manualGrade) {
      const clamped = Math.max(0, Math.min(maxPoints, manualGrade.awardedPoints));
      return {
        questionId: question.id,
        awardedPoints: clamped,
        maxPoints,
        isCorrect: clamped >= maxPoints * 0.7,
        isBlank: !hasText,
        requiresManualGrading: true,
        isManuallyGraded: true,
      };
    }
    return {
      questionId: question.id,
      awardedPoints: 0,
      maxPoints,
      isCorrect: false,
      isBlank: !hasText,
      requiresManualGrading: true,
      isManuallyGraded: false,
    };
  }

  if (!answer) {
    return {
      questionId: question.id,
      awardedPoints: 0,
      maxPoints,
      isCorrect: false,
      isBlank: true,
      requiresManualGrading: false,
      isManuallyGraded: true,
    };
  }

  switch (question.questionType) {
    case 'single_choice':
    case 'true_false':
    case 'image_question':
    case 'stimulus_case': {
      const selected = answer.selectedOptionIds || [];
      if (selected.length === 0) {
        return {
          questionId: question.id,
          awardedPoints: 0,
          maxPoints,
          isCorrect: false,
          isBlank: true,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }
      const correctId = question.correctOptionIds?.[0];
      const isCorrect = selected.length === 1 && selected[0] === correctId;
      return {
        questionId: question.id,
        awardedPoints: isCorrect ? maxPoints : 0,
        maxPoints,
        isCorrect,
        isBlank: false,
        requiresManualGrading: false,
        isManuallyGraded: true,
      };
    }

    case 'multiple_choice': {
      const selected = answer.selectedOptionIds || [];
      if (selected.length === 0) {
        return {
          questionId: question.id,
          awardedPoints: 0,
          maxPoints,
          isCorrect: false,
          isBlank: true,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }
      const correctSet = new Set(question.correctOptionIds || []);
      const selectedSet = new Set(selected);
      const exactMatch =
        correctSet.size === selectedSet.size &&
        [...correctSet].every((id) => selectedSet.has(id));

      if (question.complexScoringRule === 'partial_credit' && correctSet.size > 0) {
        let correctHits = 0;
        let wrongHits = 0;
        for (const id of selectedSet) {
          if (correctSet.has(id)) correctHits++;
          else wrongHits++;
        }
        const netRatio = Math.max(0, (correctHits - wrongHits) / correctSet.size);
        const awarded = Math.round(netRatio * maxPoints * 100) / 100;
        return {
          questionId: question.id,
          awardedPoints: exactMatch ? maxPoints : awarded,
          maxPoints,
          isCorrect: exactMatch,
          isBlank: false,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }

      return {
        questionId: question.id,
        awardedPoints: exactMatch ? maxPoints : 0,
        maxPoints,
        isCorrect: exactMatch,
        isBlank: false,
        requiresManualGrading: false,
        isManuallyGraded: true,
      };
    }

    case 'short_answer': {
      const raw = answer.textAnswer ?? '';
      if (raw.trim().length === 0) {
        return {
          questionId: question.id,
          awardedPoints: 0,
          maxPoints,
          isCorrect: false,
          isBlank: true,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }
      const normalizedUser = normalizeShortText(raw, question.caseSensitive);
      const acceptable = (question.correctShortAnswers || []).map((ans) =>
        normalizeShortText(ans, question.caseSensitive)
      );
      const isCorrect = acceptable.includes(normalizedUser);
      return {
        questionId: question.id,
        awardedPoints: isCorrect ? maxPoints : 0,
        maxPoints,
        isCorrect,
        isBlank: false,
        requiresManualGrading: false,
        isManuallyGraded: true,
      };
    }

    case 'numeric': {
      if (answer.numericAnswer === undefined || answer.numericAnswer === null || Number.isNaN(answer.numericAnswer)) {
        return {
          questionId: question.id,
          awardedPoints: 0,
          maxPoints,
          isCorrect: false,
          isBlank: true,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }
      const target = question.correctNumericValue ?? 0;
      const tolerance = question.numericTolerance ?? 0;
      const isCorrect = Math.abs(answer.numericAnswer - target) <= tolerance;
      return {
        questionId: question.id,
        awardedPoints: isCorrect ? maxPoints : 0,
        maxPoints,
        isCorrect,
        isBlank: false,
        requiresManualGrading: false,
        isManuallyGraded: true,
      };
    }

    case 'matching': {
      const pairs = question.matchingPairs || [];
      const userMap = answer.matchingAnswers || {};
      if (Object.keys(userMap).length === 0 || pairs.length === 0) {
        return {
          questionId: question.id,
          awardedPoints: 0,
          maxPoints,
          isCorrect: false,
          isBlank: true,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }
      const allCorrect = pairs.every((p) => userMap[p.id] === p.rightText);
      return {
        questionId: question.id,
        awardedPoints: allCorrect ? maxPoints : 0,
        maxPoints,
        isCorrect: allCorrect,
        isBlank: false,
        requiresManualGrading: false,
        isManuallyGraded: true,
      };
    }

    case 'ordering': {
      const expected = question.correctOrder || [];
      const userOrder = answer.orderedItems || [];
      if (userOrder.length === 0 || expected.length === 0) {
        return {
          questionId: question.id,
          awardedPoints: 0,
          maxPoints,
          isCorrect: false,
          isBlank: true,
          requiresManualGrading: false,
          isManuallyGraded: true,
        };
      }
      const isCorrect =
        expected.length === userOrder.length &&
        expected.every((item, idx) => item === userOrder[idx]);
      return {
        questionId: question.id,
        awardedPoints: isCorrect ? maxPoints : 0,
        maxPoints,
        isCorrect,
        isBlank: false,
        requiresManualGrading: false,
        isManuallyGraded: true,
      };
    }
  }
}

export interface AttemptScoreSummary {
  objectivePoints: number;
  essayPoints: number;
  maxPossiblePoints: number;
  objectiveScoreNormalized: number;
  finalScoreNormalized: number;
  isProvisional: boolean;
  questionResults: QuestionGradeResult[];
}

export function calculateAttemptScore(
  questions: Question[],
  answers: Record<string, AttemptAnswer>,
  manualGrades: Record<string, ManualGradeRecord> = {}
): AttemptScoreSummary {
  let objectivePoints = 0;
  let essayPoints = 0;
  let maxPossiblePoints = 0;
  let isProvisional = false;
  const questionResults: QuestionGradeResult[] = [];

  for (const q of questions) {
    const res = gradeQuestionAnswer(q, answers[q.id], manualGrades[q.id]);
    questionResults.push(res);
    maxPossiblePoints += q.points;

    if (res.requiresManualGrading) {
      if (res.isManuallyGraded) {
        essayPoints += res.awardedPoints;
      } else {
        isProvisional = true;
      }
    } else {
      objectivePoints += res.awardedPoints;
    }
  }

  const totalAwarded = objectivePoints + essayPoints;
  const finalScoreNormalized =
    maxPossiblePoints > 0 ? Math.round((totalAwarded / maxPossiblePoints) * 100) : 0;
  const objectiveScoreNormalized =
    maxPossiblePoints > 0 ? Math.round((objectivePoints / maxPossiblePoints) * 100) : 0;

  return {
    objectivePoints,
    essayPoints,
    maxPossiblePoints,
    objectiveScoreNormalized,
    finalScoreNormalized,
    isProvisional,
    questionResults,
  };
}

export interface PrePostParticipantComparison {
  participantId: string;
  participantName: string;
  participantCode: string;
  groupName: string;
  pretestScore: number | null;
  posttestScore: number | null;
  isCompletePair: boolean;
  deltaScore: number | null;
  relativeChangePct: number | null; // Null if pretestScore === 0 or incomplete
  nGain: number | null; // Null if pretestScore === maxScore or incomplete
  nGainCategory: 'Tinggi' | 'Sedang' | 'Rendah' | 'Tidak Dapat Dihitung' | 'Belum Lengkap';
  trend: 'meningkat' | 'tetap' | 'menurun' | 'belum_lengkap';
}

export function computeSinglePrePostMetrics(
  preScore: number | null,
  postScore: number | null,
  maxScore = 100
): Pick<
  PrePostParticipantComparison,
  'isCompletePair' | 'deltaScore' | 'relativeChangePct' | 'nGain' | 'nGainCategory' | 'trend'
> {
  if (preScore === null || postScore === null) {
    return {
      isCompletePair: false,
      deltaScore: null,
      relativeChangePct: null,
      nGain: null,
      nGainCategory: 'Belum Lengkap',
      trend: 'belum_lengkap',
    };
  }

  const deltaScore = Number((postScore - preScore).toFixed(2));

  // Avoid division by zero when initial score is 0
  const relativeChangePct =
    preScore > 0 ? Number((((postScore - preScore) / preScore) * 100).toFixed(1)) : null;

  // N-Gain calculation: (Post - Pre) / (Max - Pre)
  // If Pre already reached Max, N-Gain cannot be computed
  let nGain: number | null = null;
  let nGainCategory: PrePostParticipantComparison['nGainCategory'] = 'Tidak Dapat Dihitung';

  if (preScore < maxScore) {
    nGain = Number(((postScore - preScore) / (maxScore - preScore)).toFixed(2));
    if (nGain >= 0.7) {
      nGainCategory = 'Tinggi';
    } else if (nGain >= 0.3) {
      nGainCategory = 'Sedang';
    } else {
      nGainCategory = 'Rendah';
    }
  }

  const trend: PrePostParticipantComparison['trend'] =
    deltaScore > 0 ? 'meningkat' : deltaScore < 0 ? 'menurun' : 'tetap';

  return {
    isCompletePair: true,
    deltaScore,
    relativeChangePct,
    nGain,
    nGainCategory,
    trend,
  };
}

export function pairPrePostAttempts(
  preAttempts: AssessmentAttempt[],
  postAttempts: AssessmentAttempt[],
  maxScore = 100
): PrePostParticipantComparison[] {
  const map = new Map<
    string,
    {
      participantId: string;
      participantName: string;
      participantCode: string;
      groupName: string;
      pre?: AssessmentAttempt;
      post?: AssessmentAttempt;
    }
  >();

  for (const att of preAttempts) {
    if (att.status !== 'submitted' && att.status !== 'graded') continue;
    map.set(att.participantId, {
      participantId: att.participantId,
      participantName: att.participantName,
      participantCode: att.participantCode,
      groupName: att.groupName,
      pre: att,
    });
  }

  for (const att of postAttempts) {
    if (att.status !== 'submitted' && att.status !== 'graded') continue;
    const existing = map.get(att.participantId);
    if (existing) {
      existing.post = att;
    } else {
      map.set(att.participantId, {
        participantId: att.participantId,
        participantName: att.participantName,
        participantCode: att.participantCode,
        groupName: att.groupName,
        post: att,
      });
    }
  }

  return Array.from(map.values()).map((entry) => {
    const preScore = entry.pre ? entry.pre.finalScore : null;
    const postScore = entry.post ? entry.post.finalScore : null;
    const metrics = computeSinglePrePostMetrics(preScore, postScore, maxScore);
    return {
      participantId: entry.participantId,
      participantName: entry.participantName,
      participantCode: entry.participantCode,
      groupName: entry.groupName,
      pretestScore: preScore,
      posttestScore: postScore,
      ...metrics,
    };
  });
}

export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  highest: number;
  lowest: number;
  stdDev: number;
  passRatePct: number;
  distribution: { range: string; count: number }[];
}

export function computeSummaryStats(scores: number[], passingScore = 70): StatisticalSummary {
  const buckets = [
    { range: '0–40', min: 0, max: 40, count: 0 },
    { range: '41–60', min: 41, max: 60, count: 0 },
    { range: '61–75', min: 61, max: 75, count: 0 },
    { range: '76–85', min: 76, max: 85, count: 0 },
    { range: '86–100', min: 86, max: 100, count: 0 },
  ];

  if (scores.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      highest: 0,
      lowest: 0,
      stdDev: 0,
      passRatePct: 0,
      distribution: buckets.map(({ range, count }) => ({ range, count })),
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Number((sum / count).toFixed(1));
  const mid = Math.floor(count / 2);
  const median =
    count % 2 !== 0
      ? sorted[mid]
      : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  const lowest = sorted[0];
  const highest = sorted[count - 1];

  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Number(Math.sqrt(variance).toFixed(1));
  const passedCount = sorted.filter((s) => s >= passingScore).length;
  const passRatePct = Number(((passedCount / count) * 100).toFixed(1));

  for (const s of sorted) {
    const clamped = Math.max(0, Math.min(100, Math.round(s)));
    for (const b of buckets) {
      if (clamped >= b.min && clamped <= b.max) {
        b.count++;
        break;
      }
    }
  }

  return {
    count,
    mean,
    median,
    highest,
    lowest,
    stdDev,
    passRatePct,
    distribution: buckets.map(({ range, count: c }) => ({ range, count: c })),
  };
}

export interface ItemAnalysisResult {
  questionId: string;
  prompt: string;
  questionType: string;
  category: string;
  totalAttempts: number;
  answeredCount: number;
  correctPct: number;
  wrongPct: number;
  blankPct: number;
  empiricalDifficultyProportion: number; // 0.00 - 1.00
  difficultyInterpretation: 'Mudah (P > 0.70)' | 'Sedang (0.30 ≤ P ≤ 0.70)' | 'Sukar (P < 0.30)';
  optionDistribution: { optionId: string; label: string; count: number; pct: number }[];
  needsReview: boolean;
  reviewReason?: string;
}

export function computeItemAnalysis(
  question: Question,
  attempts: AssessmentAttempt[]
): ItemAnalysisResult {
  const validAttempts = attempts.filter(
    (a) => a.status === 'submitted' || a.status === 'graded'
  );
  const total = validAttempts.length;

  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const optionCounts: Record<string, number> = {};

  for (const opt of question.options || []) {
    optionCounts[opt.id] = 0;
  }

  for (const att of validAttempts) {
    const ans = att.answers[question.id];
    const grade = gradeQuestionAnswer(question, ans, att.manualGrades?.[question.id]);

    if (grade.isBlank) {
      blankCount++;
    } else if (grade.isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }

    for (const optId of ans?.selectedOptionIds || []) {
      if (optionCounts[optId] !== undefined) {
        optionCounts[optId]++;
      }
    }
  }

  const correctPct = total > 0 ? Number(((correctCount / total) * 100).toFixed(1)) : 0;
  const wrongPct = total > 0 ? Number(((wrongCount / total) * 100).toFixed(1)) : 0;
  const blankPct = total > 0 ? Number(((blankCount / total) * 100).toFixed(1)) : 0;
  const pValue = total > 0 ? Number((correctCount / total).toFixed(2)) : 0;

  let difficultyInterpretation: ItemAnalysisResult['difficultyInterpretation'] =
    'Sedang (0.30 ≤ P ≤ 0.70)';
  if (pValue > 0.7) difficultyInterpretation = 'Mudah (P > 0.70)';
  else if (pValue < 0.3) difficultyInterpretation = 'Sukar (P < 0.30)';

  const optionDistribution = (question.options || []).map((opt) => ({
    optionId: opt.id,
    label: opt.label,
    count: optionCounts[opt.id] || 0,
    pct: total > 0 ? Number((((optionCounts[opt.id] || 0) / total) * 100).toFixed(1)) : 0,
  }));

  let needsReview = false;
  let reviewReason: string | undefined;

  if (total >= 2 && pValue < 0.25) {
    needsReview = true;
    reviewReason = 'Proporsi menjawab benar sangat rendah (P < 0.25) — periksa kunci jawaban atau kejelasan soal.';
  } else if (total >= 2 && blankPct > 40) {
    needsReview = true;
    reviewReason = 'Tingkat jawaban kosong tinggi (> 40%) — periksa alokasi waktu atau instruksi soal.';
  }

  return {
    questionId: question.id,
    prompt: question.prompt,
    questionType: question.questionType,
    category: question.category,
    totalAttempts: total,
    answeredCount: total - blankCount,
    correctPct,
    wrongPct,
    blankPct,
    empiricalDifficultyProportion: pValue,
    difficultyInterpretation,
    optionDistribution,
    needsReview,
    reviewReason,
  };
}
