import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import {
  computeItemAnalysis,
  computeSummaryStats,
  pairPrePostAttempts,
} from '../utils/scoring';

export const ResultsAnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { assessments, attempts, questions, groups } = useApp();

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    id || 'asm-bio-posttest'
  );
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<'prepost' | 'items' | 'participants'>(
    'prepost'
  );

  const selectedAssessment =
    assessments.find((a) => a.id === selectedAssessmentId) || assessments[1] || assessments[0];

  const preAttempts = useMemo(
    () =>
      attempts.filter(
        (a) =>
          a.assessmentId === 'asm-bio-pretest' &&
          (groupFilter === 'all' || a.groupName === groupFilter)
      ),
    [attempts, groupFilter]
  );

  const postAttempts = useMemo(
    () =>
      attempts.filter(
        (a) =>
          a.assessmentId === 'asm-bio-posttest' &&
          (groupFilter === 'all' || a.groupName === groupFilter)
      ),
    [attempts, groupFilter]
  );

  const pairedRows = useMemo(
    () => pairPrePostAttempts(preAttempts, postAttempts, 100),
    [preAttempts, postAttempts]
  );

  const activityAttempts = useMemo(
    () =>
      attempts.filter(
        (a) =>
          a.assessmentId === selectedAssessment.id &&
          (a.status === 'graded' || a.status === 'submitted') &&
          (groupFilter === 'all' || a.groupName === groupFilter)
      ),
    [attempts, selectedAssessment.id, groupFilter]
  );

  const scores = activityAttempts.map((a) => a.finalScore);
  const summaryStats = useMemo(
    () => computeSummaryStats(scores, selectedAssessment.passingScore),
    [scores, selectedAssessment.passingScore]
  );

  const activityQuestions = useMemo(
    () => questions.filter((q) => selectedAssessment.questionIds.includes(q.id)),
    [questions, selectedAssessment.questionIds]
  );

  const itemAnalysisList = useMemo(
    () => activityQuestions.map((q) => computeItemAnalysis(q, activityAttempts)),
    [activityQuestions, activityAttempts]
  );

  const completePairs = pairedRows.filter((r) => r.isCompletePair);
  const increasedCount = completePairs.filter((r) => r.trend === 'meningkat').length;
  const steadyCount = completePairs.filter((r) => r.trend === 'tetap').length;
  const decreasedCount = completePairs.filter((r) => r.trend === 'menurun').length;

  const chartComparisonData = pairedRows.map((r) => ({
    peserta: r.participantName.split(' ')[0],
    Pretest: r.pretestScore ?? 0,
    Posttest: r.posttestScore ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span> Hasil dan Analitik
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">
            Analitik Hasil, Pasangan Pretest–Posttest &amp; Butir Soal
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Evaluasi statistik deskriptif, indeks N-Gain, distribusi nilai, dan tingkat kesukaran empiris.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/reports"
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Unduh Laporan Lengkap</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="analytics-assessment-select" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Pilih Kegiatan Asesmen untuk Dianalisis
          </label>
          <select
            id="analytics-assessment-select"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            aria-label="Pilih kegiatan untuk dianalisis"
            className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.accessCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="analytics-group-select" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Filter Kelompok / Kelas Peserta
          </label>
          <select
            id="analytics-group-select"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            aria-label="Filter kelompok peserta"
            className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Semua Kelompok / Kelas</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistical Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Rata-rata (Mean)</div>
          <div className="text-xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {summaryStats.mean}
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Nilai Tengah (Median)</div>
          <div className="text-xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {summaryStats.median}
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Nilai Tertinggi</div>
          <div className="text-xl font-bold text-[#16A34A] font-mono-tabular mt-1">
            {summaryStats.highest}
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Nilai Terendah</div>
          <div className="text-xl font-bold text-slate-700 font-mono-tabular mt-1">
            {summaryStats.lowest}
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Simpangan Baku (SD)</div>
          <div className="text-xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {summaryStats.stdDev}
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Persentase Kelulusan</div>
          <div className="text-xl font-bold text-[#4A7C59] font-mono-tabular mt-1">
            {summaryStats.passRatePct}%
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-[11px] text-slate-500">Pasangan Lengkap</div>
          <div className="text-xl font-bold text-[#111C2D] font-mono-tabular mt-1">
            {completePairs.length}/{pairedRows.length}
          </div>
        </div>
      </div>

      {/* Charts Row: Pretest vs Posttest & Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#111C2D]">
              Grafik Perbandingan Nilai Pretest dan Posttest Peserta
            </h2>
            <p className="text-xs text-slate-500">
              Pasangan identitas unik peserta terverifikasi · Meningkat: {increasedCount} · Tetap: {steadyCount} · Menurun: {decreasedCount}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="peserta" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Pretest" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Posttest" fill="#4A7C59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#111C2D]">
              Distribusi Rentang Nilai ({selectedAssessment.title.slice(0, 28)}...)
            </h2>
            <p className="text-xs text-slate-500">
              Sebaran skor peserta pada lima kelompok interval nilai.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryStats.distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Jumlah Peserta" fill="#111C2D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-[#E2E8F0] w-fit">
        <button
          type="button"
          onClick={() => setActiveSection('prepost')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSection === 'prepost'
              ? 'bg-[#4A7C59] text-white'
              : 'text-slate-600 hover:text-[#111C2D]'
          }`}
        >
          Tabel Pasangan Pretest &amp; Posttest (N-Gain)
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('items')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSection === 'items'
              ? 'bg-[#4A7C59] text-white'
              : 'text-slate-600 hover:text-[#111C2D]'
          }`}
        >
          Analisis Butir Soal Empiris ({itemAnalysisList.length} Soal)
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('participants')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeSection === 'participants'
              ? 'bg-[#4A7C59] text-white'
              : 'text-slate-600 hover:text-[#111C2D]'
          }`}
        >
          Daftar Hasil Peserta ({activityAttempts.length})
        </button>
      </div>

      {/* Tab 1: Pretest & Posttest Comparison Table */}
      {activeSection === 'prepost' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#111C2D]">
                Matriks Evaluasi Pasangan Pretest &amp; Posttest Peserta
              </h3>
              <p className="text-xs text-slate-500">
                Peserta dipasangkan berdasarkan ID unik terverifikasi. Peserta yang baru menyelesaikan satu tes ditandai Belum Lengkap.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Identitas Peserta</th>
                  <th className="py-3 px-4 font-semibold">Kelompok</th>
                  <th className="py-3 px-4 font-semibold text-right">Nilai Pretest</th>
                  <th className="py-3 px-4 font-semibold text-right">Nilai Posttest</th>
                  <th className="py-3 px-4 font-semibold text-right">Selisih (Δ)</th>
                  <th className="py-3 px-4 font-semibold text-right">Perubahan Relatif</th>
                  <th className="py-3 px-4 font-semibold text-right">Indeks N-Gain</th>
                  <th className="py-3 px-4 font-semibold">Kategori / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {pairedRows.map((row) => (
                  <tr key={row.participantId} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#111C2D]">{row.participantName}</div>
                      <div className="text-xs font-mono-tabular text-slate-500">
                        {row.participantCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{row.groupName}</td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                      {row.pretestScore !== null ? row.pretestScore : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                      {row.posttestScore !== null ? row.posttestScore : 'Belum Selesai'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-bold">
                      {row.deltaScore !== null ? (
                        <span
                          className={
                            row.deltaScore > 0
                              ? 'text-[#16A34A]'
                              : row.deltaScore < 0
                              ? 'text-[#DC2626]'
                              : 'text-slate-600'
                          }
                        >
                          {row.deltaScore > 0 ? `+${row.deltaScore}` : row.deltaScore}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-xs">
                      {row.relativeChangePct !== null
                        ? `${row.relativeChangePct > 0 ? '+' : ''}${row.relativeChangePct}%`
                        : row.pretestScore === 0
                        ? 'Tidak dihitung (Pre=0)'
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-[#111C2D]">
                      {row.nGain !== null ? row.nGain.toFixed(2) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {row.isCompletePair ? (
                        <span className="text-[#4A7C59]">
                          N-Gain {row.nGainCategory} ({row.trend})
                        </span>
                      ) : (
                        <span className="text-[#D97706]">Belum Lengkap (1 Tes)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#F8F9F7] border-t border-[#E2E8F0] text-xs text-slate-600">
            <strong>Catatan Metodologis:</strong> Perubahan nilai (Δ = Posttest − Pretest) dan indeks N-Gain merupakan indikator deskriptif perkembangan capaian peserta dan tidak secara otomatis membuktikan bahwa suatu intervensi pembelajaran menjadi penyebab tunggal peningkatan nilai tanpa pengendalian faktor eksternal.
          </div>
        </div>
      )}

      {/* Tab 2: Item Analysis Table */}
      {activeSection === 'items' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0]">
            <h3 className="text-base font-bold text-[#111C2D]">
              Analisis Butir Soal &amp; Tingkat Kesukaran Empiris (Proporsi P)
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan proporsi peserta menjawab benar, salah, kosong, distribusi opsi, serta deteksi soal yang perlu ditinjau.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">ID &amp; Pertanyaan</th>
                  <th className="py-3 px-4 font-semibold">Tipe</th>
                  <th className="py-3 px-4 font-semibold text-right">Menjawab</th>
                  <th className="py-3 px-4 font-semibold text-right">% Benar</th>
                  <th className="py-3 px-4 font-semibold text-right">% Salah</th>
                  <th className="py-3 px-4 font-semibold text-right">% Kosong</th>
                  <th className="py-3 px-4 font-semibold text-right">Indeks P</th>
                  <th className="py-3 px-4 font-semibold">Status Tinjauan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {itemAnalysisList.map((item) => (
                  <tr key={item.questionId} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-mono-tabular font-bold text-[#111C2D]">
                        {item.questionId} · {item.category}
                      </div>
                      <div className="text-slate-600 line-clamp-1 mt-0.5">{item.prompt}</div>
                      {item.optionDistribution.length > 0 && (
                        <div className="text-[11px] text-slate-500 mt-1 font-mono-tabular">
                          Distribusi Opsi:{' '}
                          {item.optionDistribution
                            .map((o) => `${o.label}: ${o.pct}%`)
                            .join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{item.questionType}</td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular">
                      {item.answeredCount}/{item.totalAttempts}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#16A34A]">
                      {item.correctPct}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-[#DC2626]">
                      {item.wrongPct}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-500">
                      {item.blankPct}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-bold text-[#111C2D]">
                      {item.empiricalDifficultyProportion.toFixed(2)}
                      <span className="block text-[10px] font-normal text-slate-500">
                        {item.difficultyInterpretation}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.needsReview ? (
                        <span className="text-[#D97706] font-semibold">
                          Perlu Ditinjau ({item.reviewReason})
                        </span>
                      ) : (
                        <span className="text-[#16A34A] font-semibold">Optimal / Valid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Participant Results List */}
      {activeSection === 'participants' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Nama Peserta</th>
                  <th className="py-3 px-4 font-semibold">Kode</th>
                  <th className="py-3 px-4 font-semibold">Kelompok</th>
                  <th className="py-3 px-4 font-semibold text-right">Skor Objektif</th>
                  <th className="py-3 px-4 font-semibold text-right">Skor Esai</th>
                  <th className="py-3 px-4 font-semibold text-right">Nilai Akhir</th>
                  <th className="py-3 px-4 font-semibold">Kelulusan</th>
                  <th className="py-3 px-4 font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {activityAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-[#111C2D]">
                      {att.participantName}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs">{att.participantCode}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{att.groupName}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular">{att.objectiveScore}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular">{att.essayScore}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-bold text-[#111C2D]">
                      {att.finalScore}/100
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold">
                      {att.isProvisional ? (
                        <span className="text-[#D97706]">Nilai Sementara</span>
                      ) : att.passed ? (
                        <span className="text-[#16A34A]">Lulus</span>
                      ) : (
                        <span className="text-[#DC2626]">Belum Lulus</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/exam/${att.id}/result`}
                        className="text-xs font-semibold text-[#4A7C59] hover:underline"
                      >
                        Lihat Lembar Jawaban →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const REPORT_TYPES = [
  { id: 'rekap_kegiatan', label: 'Rekapitulasi Hasil Kegiatan' },
  { id: 'daftar_nilai', label: 'Daftar Nilai Peserta' },
  { id: 'pre_post', label: 'Perbandingan Pretest dan Posttest (N-Gain)' },
  { id: 'analisis_soal', label: 'Analisis Butir Soal Empiris' },
  { id: 'status_pengerjaan', label: 'Rekapitulasi Status Pengerjaan' },
  { id: 'per_kelompok', label: 'Laporan per Kelompok atau Kelas' },
  { id: 'eksekutif', label: 'Laporan Kegiatan untuk Penyelenggara' },
];

export const ReportsExportPage: React.FC = () => {
  const { assessments, attempts, questions, addToast } = useApp();

  const [reportType, setReportType] = useState<string>('pre_post');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('asm-bio-posttest');

  const selectedAssessment =
    assessments.find((a) => a.id === selectedAssessmentId) || assessments[1] || assessments[0];

  const preAttempts = attempts.filter((a) => a.assessmentId === 'asm-bio-pretest');
  const postAttempts = attempts.filter((a) => a.assessmentId === 'asm-bio-posttest');
  const pairedRows = pairPrePostAttempts(preAttempts, postAttempts, 100);

  const activityAttempts = attempts.filter((a) => a.assessmentId === selectedAssessment.id);
  const stats = computeSummaryStats(
    activityAttempts.map((a) => a.finalScore),
    selectedAssessment.passingScore
  );

  const handleDownloadCsv = () => {
    let csv = '';
    if (reportType === 'pre_post') {
      const headers = [
        'Kode Peserta',
        'Nama Peserta',
        'Kelompok',
        'Nilai Pretest',
        'Nilai Posttest',
        'Selisih',
        'Perubahan Relatif (%)',
        'N-Gain',
        'Kategori N-Gain',
      ];
      const rows = pairedRows.map((r) => [
        r.participantCode,
        `"${r.participantName}"`,
        `"${r.groupName}"`,
        r.pretestScore ?? '',
        r.posttestScore ?? '',
        r.deltaScore ?? '',
        r.relativeChangePct ?? '',
        r.nGain ?? '',
        r.nGainCategory,
      ]);
      csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      const headers = [
        'Kode Peserta',
        'Nama Peserta',
        'Kelompok',
        'Status',
        'Skor Objektif',
        'Skor Esai',
        'Nilai Akhir',
        'Kelulusan',
      ];
      const rows = activityAttempts.map((a) => [
        a.participantCode,
        `"${a.participantName}"`,
        `"${a.groupName}"`,
        a.status,
        a.objectiveScore,
        a.essayScore,
        a.finalScore,
        a.passed ? 'Lulus' : 'Belum Lulus',
      ]);
      csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-${reportType}-${selectedAssessment.accessCode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Laporan CSV Diunduh', 'Data laporan berhasil diekspor ke format CSV.');
  };

  const handleDownloadExcel = () => {
    // Tab-separated UTF-16/UTF-8 BOM compatible with Microsoft Excel & Google Sheets
    const headers = [
      'Identitas Kegiatan',
      'Kode Peserta',
      'Nama Peserta',
      'Kelompok',
      'Nilai Pretest',
      'Nilai Posttest',
      'Selisih Nilai',
      'N-Gain',
      'Kategori',
    ];
    const rows = pairedRows.map((r) => [
      selectedAssessment.title,
      r.participantCode,
      r.participantName,
      r.groupName,
      String(r.pretestScore ?? '-'),
      String(r.posttestScore ?? '-'),
      String(r.deltaScore ?? '-'),
      String(r.nGain ?? '-'),
      r.nGainCategory,
    ]);
    const tsv = '\uFEFF' + [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-excel-${reportType}-${selectedAssessment.accessCode}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Laporan Excel Diunduh', 'Berkas Spreadsheet (.xls) berhasil diunduh.');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span> Laporan &amp; Ekspor Data
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">Pusat Laporan Resmi &amp; Ekspor</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Unduh rekapitulasi nilai, perbandingan Pretest–Posttest, dan analisis butir soal dalam format Excel, CSV, atau PDF/Cetak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
            <span>Unduh Excel (.xls)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#4A7C59]" />
            <span>Unduh CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selector Bar */}
      <div className="no-print bg-white border border-[#E2E8F0] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="rep-type" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Pilih Jenis Laporan Resmi
          </label>
          <select
            id="rep-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rep-asm" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Pilih Kegiatan Asesmen
          </label>
          <select
            id="rep-asm"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.accessCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Official Report Document */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-6">
        <div className="border-b border-[#E2E8F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#4A7C59]">
              DOKUMEN LAPORAN EVALUASI ASESMEN DIGITAL — ASESMEN-ASKIA
            </div>
            <h2 className="text-xl font-bold text-[#111C2D] mt-0.5">
              {REPORT_TYPES.find((r) => r.id === reportType)?.label}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Kegiatan: <strong>{selectedAssessment.title}</strong> · Penyelenggara: {selectedAssessment.organizer}
            </p>
          </div>
          <div className="text-xs text-slate-500 sm:text-right font-mono-tabular">
            <div>Tanggal Pelaksanaan: {selectedAssessment.startTime.slice(0, 10)}</div>
            <div>Kode Kegiatan: {selectedAssessment.accessCode}</div>
            <div>Jumlah Peserta Tercatat: {activityAttempts.length} Orang</div>
          </div>
        </div>

        {/* Summary Metrics Inside Report */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#F8F9F7] p-4 rounded-xl border border-[#E2E8F0] text-xs">
          <div>
            <span className="text-slate-500 block">Rata-rata Nilai</span>
            <strong className="text-base font-mono-tabular text-[#111C2D]">{stats.mean}/100</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Median / Simpangan Baku</span>
            <strong className="text-base font-mono-tabular text-[#111C2D]">
              {stats.median} (SD: {stats.stdDev})
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Rentang Skor (Min–Maks)</span>
            <strong className="text-base font-mono-tabular text-[#111C2D]">
              {stats.lowest} – {stats.highest}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Tingkat Kelulusan (KKM {selectedAssessment.passingScore})</span>
            <strong className="text-base font-mono-tabular text-[#16A34A]">
              {stats.passRatePct}%
            </strong>
          </div>
        </div>

        {/* Report Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Kode Peserta</th>
                <th className="py-2.5 px-3 font-semibold">Nama Peserta</th>
                <th className="py-2.5 px-3 font-semibold">Kelompok / Kelas</th>
                <th className="py-2.5 px-3 font-semibold text-right">Pretest</th>
                <th className="py-2.5 px-3 font-semibold text-right">Posttest</th>
                <th className="py-2.5 px-3 font-semibold text-right">Selisih (Δ)</th>
                <th className="py-2.5 px-3 font-semibold text-right">N-Gain</th>
                <th className="py-2.5 px-3 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {pairedRows.map((row) => (
                <tr key={row.participantId}>
                  <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                    {row.participantCode}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#111C2D]">
                    {row.participantName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{row.groupName}</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular">
                    {row.pretestScore ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular">
                    {row.posttestScore ?? 'Sedang Berjalan'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular font-bold">
                    {row.deltaScore !== null
                      ? row.deltaScore > 0
                        ? `+${row.deltaScore}`
                        : row.deltaScore
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular font-bold">
                    {row.nGain !== null ? row.nGain.toFixed(2) : '—'}
                  </td>
                  <td className="py-2.5 px-3">{row.nGainCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
