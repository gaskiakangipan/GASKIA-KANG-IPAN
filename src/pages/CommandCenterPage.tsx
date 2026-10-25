import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileEdit,
  RefreshCw,
  Search,
  ShieldAlert,
  StopCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AssessmentAttempt } from '../types/assessment';
import { AssessmentShareLinkCard } from '../components/AssessmentShareLinkCard';

export const CommandCenterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    assessments,
    attempts,
    questions,
    users,
    saveManualEssayGrade,
    forceFinishAttemptByAdmin,
    extendAttemptTimeByAdmin,
    addToast,
  } = useApp();

  const assessment = assessments.find((a) => a.id === id) || assessments[1] || assessments[0];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>(
    new Date().toLocaleTimeString('id-ID')
  );

  // Essay Grading Modal State
  const [gradingAttempt, setGradingAttempt] = useState<AssessmentAttempt | null>(null);
  const [essayPointsInput, setEssayPointsInput] = useState<number>(18);
  const [essayFeedbackInput, setEssayFeedbackInput] = useState<string>(
    'Penjelasan mekanisme molekuler dan analisis bioetika sudah tepat sesuai rubrik.'
  );

  const activityAttempts = useMemo(() => {
    return attempts.filter((a) => a.assessmentId === assessment.id);
  }, [attempts, assessment.id]);

  const essayQuestion = useMemo(() => {
    return (
      questions.find(
        (q) => assessment.questionIds.includes(q.id) && q.questionType === 'essay'
      ) || questions.find((q) => q.questionType === 'essay')
    );
  }, [questions, assessment.questionIds]);

  const totalAssigned = Math.max(
    assessment.assignedParticipantIds.length,
    activityAttempts.length
  );
  const inProgressCount = activityAttempts.filter((a) => a.status === 'in_progress').length;
  const completedCount = activityAttempts.filter(
    (a) => a.status === 'graded' || a.status === 'submitted'
  ).length;
  const notStartedCount = Math.max(0, totalAssigned - activityAttempts.length);
  const lateOrFlaggedCount = activityAttempts.filter(
    (a) => a.integrityEvents.some((ev) => ev.type === 'tab_switch') || a.status === 'late'
  ).length;

  const filteredAttempts = activityAttempts.filter((att) => {
    if (statusFilter !== 'all' && att.status !== statusFilter) return false;
    if (
      search.trim() &&
      !att.participantName.toLowerCase().includes(search.toLowerCase()) &&
      !att.participantCode.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleOpenEssayModal = (att: AssessmentAttempt) => {
    setGradingAttempt(att);
    const existingGrade = essayQuestion ? att.manualGrades?.[essayQuestion.id] : undefined;
    setEssayPointsInput(existingGrade?.awardedPoints ?? 18);
    setEssayFeedbackInput(
      existingGrade?.feedback ||
        'Uraian mekanisme CRISPR-Cas9 dan analisis bioetika telah memenuhi kriteria rubrik.'
    );
  };

  const handleSaveManualGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingAttempt || !essayQuestion) return;
    saveManualEssayGrade(
      gradingAttempt.id,
      essayQuestion.id,
      essayPointsInput,
      essayFeedbackInput
    );
    setGradingAttempt(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <Link
            to="/activities"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Kegiatan</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111C2D]">
            Command Center: {assessment.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kode Akses: <strong className="font-mono-tabular text-[#111C2D]">{assessment.accessCode}</strong> · Durasi: {assessment.durationMinutes} Menit · Pembaruan Terakhir: <span className="font-mono-tabular">{lastRefreshed}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setLastRefreshed(new Date().toLocaleTimeString('id-ID'));
              addToast('success', 'Data Disegarkan', 'Status pengerjaan peserta telah diperbarui.');
            }}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </button>
          <Link
            to="/results"
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            Buka Analitik Hasil
          </Link>
        </div>
      </div>

      {/* Share Assessment Link for Participants Feature */}
      <AssessmentShareLinkCard
        assessment={assessment}
        totalParticipants={totalAssigned}
        onNotify={addToast}
      />

      {/* Live Telemetry Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Peserta</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {totalAssigned}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Terdaftar pada sesi</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-slate-500">Belum Mulai</div>
          <div className="text-2xl font-bold text-slate-700 font-mono-tabular mt-1">
            {notStartedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Menunggu login</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-slate-500">Sedang Mengerjakan</div>
          <div className="text-2xl font-bold text-[#D97706] font-mono-tabular mt-1">
            {inProgressCount}
          </div>
          <div className="text-[11px] text-[#D97706] mt-0.5">Aktif terhubung</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-slate-500">Peserta Selesai</div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono-tabular mt-1">
            {completedCount}
          </div>
          <div className="text-[11px] text-[#16A34A] mt-0.5">Jawaban terkumpul</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-slate-500">Catatan Integritas / Terlambat</div>
          <div className="text-2xl font-bold text-[#DC2626] font-mono-tabular mt-1">
            {lateOrFlaggedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Perpindahan tab tercatat</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau kode peserta..."
            aria-label="Cari peserta di Command Center"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status pengerjaan"
            className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Semua Status Pengerjaan</option>
            <option value="in_progress">Sedang Mengerjakan</option>
            <option value="submitted">Menunggu Penilaian Esai (Sementara)</option>
            <option value="graded">Selesai &amp; Nilai Final</option>
          </select>
        </div>
      </div>

      {/* Live Participant Monitoring Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                <th className="py-3 px-4 font-semibold">Nama Peserta</th>
                <th className="py-3 px-4 font-semibold">Kode Peserta</th>
                <th className="py-3 px-4 font-semibold">Status Pengerjaan</th>
                <th className="py-3 px-4 font-semibold">Waktu Mulai</th>
                <th className="py-3 px-4 font-semibold text-right">Sisa Waktu</th>
                <th className="py-3 px-4 font-semibold">Waktu Pengumpulan</th>
                <th className="py-3 px-4 font-semibold text-right">Nilai</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi Pengawas &amp; Penilaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filteredAttempts.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#111C2D]">{att.participantName}</div>
                    <div className="text-xs text-slate-500">{att.groupName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-xs font-semibold text-slate-700">
                    {att.participantCode}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {att.status === 'in_progress' ? (
                      <span className="font-semibold text-[#D97706]">Sedang Mengerjakan</span>
                    ) : att.isProvisional ? (
                      <span className="font-semibold text-[#D97706]">
                        Nilai Sementara (Esai Belum Dinilai)
                      </span>
                    ) : (
                      <span className="font-semibold text-[#16A34A]">Selesai &amp; Final</span>
                    )}
                    {att.integrityEvents.some((e) => e.type === 'tab_switch') && (
                      <div className="text-[11px] text-[#DC2626] mt-0.5">
                        Peringatan: Perpindahan tab tercatat
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-600">
                    {att.startedAt.slice(11, 16)} WIB
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-xs text-right font-semibold">
                    {Math.floor(att.remainingSeconds / 60)}m {att.remainingSeconds % 60}d
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-600">
                    {att.submittedAt ? `${att.submittedAt.slice(11, 16)} WIB` : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-right font-bold text-[#111C2D]">
                    {att.finalScore}/100
                    {att.isProvisional && (
                      <span className="block text-[10px] font-normal text-[#D97706]">
                        Sementara
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {att.status === 'in_progress' && (
                      <>
                        <button
                          type="button"
                          onClick={() => extendAttemptTimeByAdmin(att.id, 10)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-md hover:bg-slate-100"
                        >
                          +10 Menit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            forceFinishAttemptByAdmin(att.id, 'Dihentikan oleh pengawas di Command Center')
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                        >
                          Hentikan &amp; Kumpulkan
                        </button>
                      </>
                    )}

                    {essayQuestion && (
                      <button
                        type="button"
                        onClick={() => handleOpenEssayModal(att)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-[#4A7C59] hover:bg-[#3D6849] rounded-md"
                      >
                        {att.isProvisional ? 'Nilai Esai Manual' : 'Tinjau Skor Esai'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Essay Grading Modal */}
      {gradingAttempt && essayQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="text-xs font-semibold text-[#4A7C59]">
                  Penilaian Manual Soal Esai &amp; Rubrik
                </div>
                <h3 className="text-base font-bold text-[#111C2D]">
                  Peserta: {gradingAttempt.participantName} ({gradingAttempt.participantCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGradingAttempt(null)}
                className="text-xs text-slate-500 hover:text-[#111C2D]"
              >
                Tutup ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#111C2D]">Pertanyaan Esai (Bobot Maksimum: {essayQuestion.points} Poin):</div>
              <p className="p-3 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-slate-700">
                {essayQuestion.prompt}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#111C2D]">Jawaban Peserta:</div>
              <div className="p-4 rounded-lg bg-[#EEF4F0]/50 border border-[#4A7C59]/30 text-[#111C2D] leading-relaxed">
                {gradingAttempt.answers[essayQuestion.id]?.textAnswer ||
                  '(Peserta tidak menuliskan jawaban esai)'}
              </div>
            </div>

            {essayQuestion.rubric && essayQuestion.rubric.length > 0 && (
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-[#111C2D]">Rubrik Penilaian Standar:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {essayQuestion.rubric.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0]">
                      <div className="font-semibold text-[#111C2D]">
                        {r.criterion} (Maks {r.maxPoints} Poin)
                      </div>
                      <p className="text-slate-600 mt-0.5">{r.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveManualGrade} className="space-y-4 pt-2 border-t border-[#E2E8F0]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="grade-pts" className="block text-xs font-semibold text-[#111C2D] mb-1">
                    Skor Diberikan (0 – {essayQuestion.points})
                  </label>
                  <input
                    id="grade-pts"
                    type="number"
                    min={0}
                    max={essayQuestion.points}
                    value={essayPointsInput}
                    onChange={(e) => setEssayPointsInput(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-sm font-mono-tabular font-bold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="grade-fb" className="block text-xs font-semibold text-[#111C2D] mb-1">
                    Catatan / Umpan Balik Instruktur
                  </label>
                  <input
                    id="grade-fb"
                    type="text"
                    value={essayFeedbackInput}
                    onChange={(e) => setEssayFeedbackInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradingAttempt(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#4A7C59] hover:bg-[#3D6849] rounded-lg"
                >
                  Simpan Penilaian &amp; Publikasikan Nilai Final
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
