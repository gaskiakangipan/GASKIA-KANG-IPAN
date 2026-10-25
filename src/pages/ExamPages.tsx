import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Flag,
  Play,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DiagramStimulus } from '../components/DiagramStimulus';
import { gradeQuestionAnswer } from '../utils/scoring';
import { parseParticipantJoinParams } from '../utils/shareAssessmentLink';

export const JoinExamPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, assessments, startOrResumeAttempt, addToast } = useApp();

  const parsedJoin = useMemo(() => {
    return parseParticipantJoinParams(
      location.search,
      location.pathname,
      typeof window !== 'undefined' ? window.location.hash : ''
    );
  }, [location.search, location.pathname]);

  const resolvedCode = code || parsedJoin.accessCode || searchParams.get('join') || 'POST-BIO-26';
  const resolvedToken = parsedJoin.token || searchParams.get('token') || '';

  const [inputCode, setInputCode] = useState(resolvedCode);

  useEffect(() => {
    if (resolvedCode) {
      setInputCode(resolvedCode);
    }
  }, [resolvedCode]);

  const matchedAssessment = useMemo(() => {
    const clean = inputCode.trim().toUpperCase();
    return (
      assessments.find(
        (a) => a.accessCode.toUpperCase() === clean || a.id.toUpperCase() === clean
      ) || assessments[1] || assessments[0]
    );
  }, [assessments, inputCode]);

  const [tokenInput, setTokenInput] = useState(
    resolvedToken || matchedAssessment?.examToken || 'BIO202'
  );

  useEffect(() => {
    if (resolvedToken) {
      setTokenInput(resolvedToken);
    } else if (matchedAssessment?.examToken) {
      setTokenInput(matchedAssessment.examToken);
    }
  }, [resolvedToken, matchedAssessment?.examToken]);

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    const attempt = startOrResumeAttempt(
      matchedAssessment.id,
      tokenInput || matchedAssessment.examToken || 'BIO202'
    );
    addToast('success', 'Sesi Ujian Dimulai', `Selamat mengerjakan ${matchedAssessment.title}.`);
    navigate(`/exam/${attempt.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6" data-testid="participant-join-exam-page">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF4F0] text-xs font-semibold text-[#3D6849]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>
              Gerbang Pelaksanaan Asesmen Terverifikasi ({matchedAssessment.accessCode})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">{matchedAssessment.title}</h1>
          <p className="text-xs text-slate-600">{matchedAssessment.description}</p>
        </div>

        {/* Participant Identity Card */}
        <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Identitas Peserta</span>
            <strong className="text-[#111C2D] text-sm">{currentUser.fullName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Kode Peserta / Institusi</span>
            <strong className="font-mono-tabular text-[#111C2D]">
              {currentUser.participantCode || 'PST-2026-001'} ·{' '}
              {currentUser.organizationName.replace(' [DATA DEMO]', '')}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Durasi &amp; Jumlah Soal</span>
            <strong className="font-mono-tabular text-[#111C2D]">
              {matchedAssessment.durationMinutes} Menit · {matchedAssessment.questionIds.length} Butir Soal
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Nilai Minimum Kelulusan</span>
            <strong className="font-mono-tabular text-[#4A7C59]">
              {matchedAssessment.passingScore} / 100
            </strong>
          </div>
        </div>

        <form onSubmit={handleStartExam} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="join-code-in" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Kode Akses Kegiatan
              </label>
              <input
                id="join-code-in"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular font-bold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="join-token-in" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Token Ujian (Opsional: {matchedAssessment.examToken || 'BIO202'})
              </label>
              <input
                id="join-token-in"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={matchedAssessment.examToken || 'Kosongkan bila tidak diminta'}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#EEF4F0] text-xs text-[#3D6849] space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Aturan Integritas &amp; Penyimpanan Otomatis</span>
            </div>
            <p>
              Jawaban Anda disimpan secara otomatis setiap kali memilih atau mengetik. Hindari berpindah tab selama ujian berlangsung.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link to="/dashboard" className="text-xs font-semibold text-slate-600 hover:text-[#111C2D]">
              ← Kembali ke Beranda
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-sm font-semibold rounded-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Mulai Pengerjaan Ujian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ExamRunnerPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const {
    attempts,
    assessments,
    questions,
    saveAttemptAnswer,
    logAttemptIntegrityEvent,
    submitAttempt,
  } = useApp();

  const attempt = attempts.find((a) => a.id === attemptId) || attempts[1] || attempts[0];
  const assessment =
    assessments.find((a) => a.id === attempt.assessmentId) || assessments[1] || assessments[0];

  const examQuestions = useMemo(() => {
    if (assessment.questionSnapshots && assessment.questionSnapshots.length > 0) {
      return assessment.questionSnapshots;
    }
    const list = questions.filter((q) => assessment.questionIds.includes(q.id));
    return list.length > 0 ? list : questions.slice(0, 6);
  }, [assessment, questions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number>(attempt.remainingSeconds || 1800);
  const [lastSavedText, setLastSavedText] = useState<string>('Tersimpan otomatis');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [tabWarningBanner, setTabWarningBanner] = useState<string | null>(null);

  const currentQuestion = examQuestions[currentIndex] || examQuestions[0];
  const currentAnswer = attempt.answers[currentQuestion.id];

  // Timer countdown & auto-submit when time expires
  useEffect(() => {
    if (attempt.status !== 'in_progress') return;
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitAttempt(attempt.id);
          navigate(`/exam/${attempt.id}/result`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt.id, attempt.status, navigate, submitAttempt]);

  // Tab switch integrity monitoring
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && attempt.status === 'in_progress') {
        logAttemptIntegrityEvent(
          attempt.id,
          'tab_switch',
          'Peserta meninggalkan halaman ujian (perpindahan tab terdeteksi).'
        );
        setTabWarningBanner(
          'Perhatian: Sistem mencatat aktivitas meninggalkan halaman ujian pada log integritas.'
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [attempt.id, attempt.status, logAttemptIntegrityEvent]);

  const triggerSave = (patch: Partial<typeof currentAnswer>) => {
    saveAttemptAnswer(
      attempt.id,
      {
        questionId: currentQuestion.id,
        selectedOptionIds: currentAnswer?.selectedOptionIds,
        textAnswer: currentAnswer?.textAnswer,
        numericAnswer: currentAnswer?.numericAnswer,
        matchingAnswers: currentAnswer?.matchingAnswers,
        orderedItems: currentAnswer?.orderedItems,
        flaggedForReview: currentAnswer?.flaggedForReview,
        ...patch,
        savedAt: new Date().toISOString(),
      },
      remainingSec
    );
    setLastSavedText(`Tersimpan otomatis ${new Date().toLocaleTimeString('id-ID')}`);
  };

  const isQuestionAnswered = (qId: string): boolean => {
    const ans = attempt.answers[qId];
    if (!ans) return false;
    if (ans.selectedOptionIds && ans.selectedOptionIds.length > 0) return true;
    if (ans.textAnswer && ans.textAnswer.trim().length > 0) return true;
    if (ans.numericAnswer !== undefined && !Number.isNaN(ans.numericAnswer)) return true;
    if (ans.matchingAnswers && Object.keys(ans.matchingAnswers).length > 0) return true;
    if (ans.orderedItems && ans.orderedItems.length > 0) return true;
    return false;
  };

  const answeredCount = examQuestions.filter((q) => isQuestionAnswered(q.id)).length;
  const blankCount = examQuestions.length - answeredCount;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleConfirmSubmit = () => {
    submitAttempt(attempt.id);
    setConfirmSubmitOpen(false);
    navigate(`/exam/${attempt.id}/result`);
  };

  // Initialize ordering items if ordering question
  const currentOrderedList =
    currentAnswer?.orderedItems && currentAnswer.orderedItems.length > 0
      ? currentAnswer.orderedItems
      : currentQuestion.correctOrder || [];

  const moveOrderItem = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentOrderedList.length) return;
    const copy = [...currentOrderedList];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    triggerSave({ orderedItems: copy });
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#111C2D] flex flex-col">
      {/* Focused Exam Top Bar */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div>
          <div className="text-sm font-bold text-[#111C2D]">{assessment.title}</div>
          <div className="text-xs text-slate-500">
            Peserta: <strong className="text-[#111C2D]">{attempt.participantName}</strong> ({attempt.participantCode}) · Progres: <span className="font-mono-tabular font-semibold">{answeredCount}/{examQuestions.length}</span> Terjawab
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#4A7C59] font-medium">
            <Save className="w-3.5 h-3.5" />
            <span>{lastSavedText}</span>
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-lg border font-mono-tabular text-sm font-bold flex items-center gap-2 ${
              remainingSec <= 300
                ? 'bg-amber-50 border-amber-300 text-[#D97706]'
                : 'bg-[#F8F9F7] border-[#E2E8F0] text-[#111C2D]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(remainingSec)}</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Selesaikan Ujian</span>
          </button>
        </div>
      </header>

      {/* Integrity Warning Banner if triggered */}
      {tabWarningBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-[#D97706] flex items-center justify-between">
          <span>{tabWarningBanner}</span>
          <button
            type="button"
            onClick={() => setTabWarningBanner(null)}
            className="font-semibold underline"
          >
            Mengerti
          </button>
        </div>
      )}

      {/* Main Exam Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Question Card */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-6 lg:p-8 space-y-6">
          {/* Question Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-sm font-bold text-[#111C2D] font-mono-tabular">
                Soal Nomor {currentIndex + 1} dari {examQuestions.length}
              </span>
              <span>·</span>
              <span>Bobot {currentQuestion.points} Poin</span>
            </div>

            <button
              type="button"
              onClick={() =>
                triggerSave({ flaggedForReview: !currentAnswer?.flaggedForReview })
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentAnswer?.flaggedForReview
                  ? 'bg-amber-50 border-amber-300 text-[#D97706]'
                  : 'bg-[#F8F9F7] border-[#E2E8F0] text-slate-600 hover:text-[#111C2D]'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>
                {currentAnswer?.flaggedForReview
                  ? 'Ditandai untuk Ditinjau'
                  : 'Tandai untuk Ditinjau'}
              </span>
            </button>
          </div>

          {/* Stimulus Image / Reading / Table if present */}
          {currentQuestion.questionType === 'image_question' && (
            <DiagramStimulus type={currentQuestion.svgDiagramType} />
          )}

          {currentQuestion.stimulusText && (
            <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] text-xs text-slate-700 leading-relaxed space-y-3">
              <div>{currentQuestion.stimulusText}</div>
              {currentQuestion.stimulusTable && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden border border-[#E2E8F0]">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] text-slate-600 border-b border-[#E2E8F0]">
                        {currentQuestion.stimulusTable.headers.map((h, i) => (
                          <th key={i} className="py-2 px-3 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs font-mono-tabular">
                      {currentQuestion.stimulusTable.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Question Prompt */}
          <div className="text-base font-semibold text-[#111C2D] leading-relaxed">
            {currentQuestion.prompt}
          </div>

          {/* Dynamic Answer Input Area */}
          <div className="space-y-3 pt-2">
            {(currentQuestion.questionType === 'single_choice' ||
              currentQuestion.questionType === 'true_false' ||
              currentQuestion.questionType === 'image_question' ||
              currentQuestion.questionType === 'stimulus_case') &&
              (currentQuestion.options || []).map((opt) => {
                const selected = currentAnswer?.selectedOptionIds?.includes(opt.id) ?? false;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => triggerSave({ selectedOptionIds: [opt.id] })}
                    className={`w-full p-4 rounded-xl border text-left text-sm flex items-start gap-3 transition-colors ${
                      selected
                        ? 'border-[#4A7C59] bg-[#EEF4F0] font-semibold text-[#111C2D]'
                        : 'border-[#E2E8F0] bg-[#F8F9F7] hover:bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        selected
                          ? 'bg-[#4A7C59] text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.label.slice(0, 1)}
                    </span>
                    <span className="leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}

            {currentQuestion.questionType === 'multiple_choice' &&
              (currentQuestion.options || []).map((opt) => {
                const currentSelected = currentAnswer?.selectedOptionIds || [];
                const selected = currentSelected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? currentSelected.filter((id) => id !== opt.id)
                        : [...currentSelected, opt.id];
                      triggerSave({ selectedOptionIds: next });
                    }}
                    className={`w-full p-4 rounded-xl border text-left text-sm flex items-start gap-3 transition-colors ${
                      selected
                        ? 'border-[#4A7C59] bg-[#EEF4F0] font-semibold text-[#111C2D]'
                        : 'border-[#E2E8F0] bg-[#F8F9F7] hover:bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                        selected
                          ? 'bg-[#4A7C59] text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}

            {currentQuestion.questionType === 'short_answer' && (
              <div>
                <label htmlFor="ans-short" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Ketik Jawaban Singkat Anda:
                </label>
                <input
                  id="ans-short"
                  type="text"
                  value={currentAnswer?.textAnswer || ''}
                  onChange={(e) => triggerSave({ textAnswer: e.target.value })}
                  placeholder="Ketik jawaban singkat di sini..."
                  className="w-full max-w-md px-4 py-2.5 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59] focus:bg-white"
                />
              </div>
            )}

            {currentQuestion.questionType === 'numeric' && (
              <div>
                <label htmlFor="ans-numeric" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Masukkan Nilai Numerik (Gunakan titik untuk desimal, misal 0.42):
                </label>
                <input
                  id="ans-numeric"
                  type="number"
                  step="any"
                  value={currentAnswer?.numericAnswer ?? ''}
                  onChange={(e) =>
                    triggerSave({
                      numericAnswer:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="Contoh: 0.42"
                  className="w-full max-w-xs px-4 py-2.5 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59] focus:bg-white"
                />
              </div>
            )}

            {currentQuestion.questionType === 'matching' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  Pilih pasangan fungsi yang tepat untuk setiap item di sebelah kiri:
                </div>
                {(currentQuestion.matchingPairs || []).map((pair) => {
                  const selectedRight =
                    currentAnswer?.matchingAnswers?.[pair.id] || '';
                  return (
                    <div
                      key={pair.id}
                      className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center"
                    >
                      <div className="text-xs font-semibold text-[#111C2D]">
                        {pair.leftText}
                      </div>
                      <select
                        value={selectedRight}
                        onChange={(e) =>
                          triggerSave({
                            matchingAnswers: {
                              ...(currentAnswer?.matchingAnswers || {}),
                              [pair.id]: e.target.value,
                            },
                          })
                        }
                        aria-label={`Pasangan untuk ${pair.leftText}`}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                      >
                        <option value="">-- Pilih Pasangan --</option>
                        {(currentQuestion.matchingPairs || []).map((optPair) => (
                          <option key={optPair.id} value={optPair.rightText}>
                            {optPair.rightText}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQuestion.questionType === 'ordering' && (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-500">
                  Gunakan tombol panah Atas/Bawah untuk menyusun urutan tahapan yang benar:
                </div>
                {currentOrderedList.map((item, idx) => (
                  <div
                    key={item}
                    className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <span className="w-6 h-6 rounded-full bg-[#4A7C59] text-white font-mono-tabular font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-[#111C2D]">{item}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveOrderItem(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded bg-white border border-[#E2E8F0] disabled:opacity-40"
                        aria-label="Geser ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOrderItem(idx, 1)}
                        disabled={idx === currentOrderedList.length - 1}
                        className="p-1.5 rounded bg-white border border-[#E2E8F0] disabled:opacity-40"
                        aria-label="Geser ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.questionType === 'essay' && (
              <div>
                <label htmlFor="ans-essay" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tuliskan Jawaban Uraian / Esai Anda Secara Lengkap:
                </label>
                <textarea
                  id="ans-essay"
                  rows={6}
                  value={currentAnswer?.textAnswer || ''}
                  onChange={(e) => triggerSave({ textAnswer: e.target.value })}
                  placeholder="Uraikan argumen ilmiah dan analisis Anda secara terstruktur..."
                  className="w-full p-4 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#4A7C59] focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Prev / Next Navigation Buttons */}
          <div className="pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="px-4 py-2.5 text-xs font-semibold text-[#111C2D] bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg disabled:opacity-40 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentIndex < examQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((i) => Math.min(examQuestions.length - 1, i + 1))
                }
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#111C2D] hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
              >
                <span>Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(true)}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4A7C59] hover:bg-[#3D6849] rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Selesaikan Ujian</span>
              </button>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Question Number Navigator */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-[#111C2D]">Navigasi Nomor Soal</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik nomor untuk berpindah cepat ke butir soal terkait.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {examQuestions.map((q, idx) => {
              const answered = isQuestionAnswered(q.id);
              const flagged = attempt.answers[q.id]?.flaggedForReview;
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Ke soal nomor ${idx + 1}`}
                  className={`h-10 rounded-lg font-mono-tabular text-xs font-bold border transition-colors ${
                    isCurrent
                      ? 'border-[#111C2D] bg-[#111C2D] text-white'
                      : flagged
                      ? 'border-amber-400 bg-amber-50 text-[#D97706]'
                      : answered
                      ? 'border-[#4A7C59] bg-[#EEF4F0] text-[#3D6849]'
                      : 'border-[#E2E8F0] bg-[#F8F9F7] text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Sudah Dijawab</span>
              <span className="font-mono-tabular font-bold text-[#4A7C59]">{answeredCount} Soal</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Belum Dijawab (Kosong)</span>
              <span className="font-mono-tabular font-bold text-slate-700">{blankCount} Soal</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ditandai untuk Ditinjau</span>
              <span className="font-mono-tabular font-bold text-[#D97706]">
                {
                  examQuestions.filter((q) => attempt.answers[q.id]?.flaggedForReview)
                    .length
                }{' '}
                Soal
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="w-full py-2.5 px-4 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Kumpulkan Seluruh Jawaban
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[#111C2D]">
              Konfirmasi Pengumpulan Jawaban Ujian
            </h3>

            {blankCount > 0 ? (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-[#D97706] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Peringatan: Masih Ada {blankCount} Soal Belum Dijawab!</span>
                </div>
                <p>
                  Anda masih memiliki {blankCount} butir soal kosong. Apakah Anda yakin tetap ingin mengakhiri dan mengumpulkan ujian sekarang?
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh {examQuestions.length} butir soal telah dijawab. Setelah dikumpulkan, jawaban akan dikunci dan dinilai secara otomatis oleh sistem.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Kembali Periksa Jawaban
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#4A7C59] hover:bg-[#3D6849] rounded-lg"
              >
                Ya, Kumpulkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ExamResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { attempts, assessments, questions } = useApp();

  const attempt = attempts.find((a) => a.id === attemptId) || attempts[1] || attempts[0];
  const assessment =
    assessments.find((a) => a.id === attempt.assessmentId) || assessments[1] || assessments[0];
  const examQuestions = questions.filter((q) => assessment.questionIds.includes(q.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111C2D]">
            Hasil Evaluasi: {attempt.assessmentTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Peserta: <strong>{attempt.participantName}</strong> ({attempt.participantCode}) · Waktu Pengumpulan:{' '}
            <span className="font-mono-tabular">
              {attempt.submittedAt ? attempt.submittedAt.slice(0, 16).replace('T', ' ') : 'Terkumpul'}
            </span>
          </p>
        </div>

        <Link
          to="/results"
          className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg"
        >
          Lihat Analitik Pretest vs Posttest
        </Link>
      </div>

      {/* Provisional Notice if Essay Pending */}
      {attempt.isProvisional && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-[#D97706] flex items-center justify-between">
          <div>
            <strong>Status Nilai Sementara:</strong> Skor objektif Anda telah dihitung otomatis, namun terdapat soal esai yang masih menunggu penilaian manual oleh instruktur.
          </div>
          <Link
            to={`/activities/${assessment.id}/command-center`}
            className="font-semibold underline shrink-0 ml-4"
          >
            Nilai di Command Center →
          </Link>
        </div>
      )}

      {/* Score Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="text-xs text-slate-500">
            {attempt.isProvisional ? 'Nilai Sementara (Skala 100)' : 'Nilai Akhir (Skala 100)'}
          </div>
          <div className="text-3xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {attempt.finalScore}/100
          </div>
          <div
            className={`text-xs font-semibold mt-1 ${
              attempt.passed ? 'text-[#16A34A]' : 'text-[#D97706]'
            }`}
          >
            {attempt.passed
              ? `Lulus (KKM ≥ ${assessment.passingScore})`
              : `Belum Mencapai KKM (${assessment.passingScore})`}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="text-xs text-slate-500">Poin Soal Objektif</div>
          <div className="text-2xl font-bold text-[#4A7C59] font-mono-tabular mt-1">
            {attempt.objectiveScore} Poin
          </div>
          <div className="text-xs text-slate-500 mt-1">Dihitung otomatis</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="text-xs text-slate-500">Poin Soal Esai</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {attempt.essayScore} Poin
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {attempt.isProvisional ? 'Menunggu pemeriksaan manual' : 'Telah dinilai instruktur'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="text-xs text-slate-500">Versi Paket Soal</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            V{attempt.assessmentVersion}
          </div>
          <div className="text-xs text-slate-500 mt-1">Snapshot terkunci</div>
        </div>
      </div>

      {/* Item-by-Item Review & Explanation */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-[#111C2D]">
          Rincian Jawaban &amp; Pembahasan Butir Soal
        </h2>

        <div className="divide-y divide-[#E2E8F0]">
          {examQuestions.map((q, idx) => {
            const ans = attempt.answers[q.id];
            const manual = attempt.manualGrades?.[q.id];
            const grade = gradeQuestionAnswer(q, ans, manual);

            return (
              <div key={q.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-mono-tabular font-bold text-[#111C2D]">
                      Soal #{idx + 1}
                    </span>
                    <span>·</span>
                    <span>{q.category}</span>
                  </div>
                  <div className="font-mono-tabular font-bold">
                    {grade.requiresManualGrading && !grade.isManuallyGraded ? (
                      <span className="text-[#D97706]">Menunggu Penilaian Manual</span>
                    ) : grade.isCorrect ? (
                      <span className="text-[#16A34A]">
                        Benar (+{grade.awardedPoints}/{grade.maxPoints} Poin)
                      </span>
                    ) : (
                      <span className="text-[#DC2626]">
                        Skor: {grade.awardedPoints}/{grade.maxPoints} Poin
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm font-medium text-[#111C2D]">{q.prompt}</p>

                {assessment.showExplanation && (
                  <div className="p-3 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-xs text-slate-600">
                    <strong className="text-[#111C2D]">Pembahasan:</strong> {q.explanation}
                    {manual?.feedback && (
                      <div className="mt-1 text-[#4A7C59] font-medium">
                        Catatan Instruktur: &ldquo;{manual.feedback}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
