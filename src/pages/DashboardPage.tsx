import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Layers,
  Play,
  Plus,
  Radio,
  ShieldAlert,
  Users,
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
import { pairPrePostAttempts } from '../utils/scoring';

const STATUS_LABELS: Record<string, { label: string; colorClass: string }> = {
  draft: { label: 'Draf', colorClass: 'text-slate-600' },
  ready: { label: 'Siap Diujikan', colorClass: 'text-[#4A7C59]' },
  scheduled: { label: 'Terjadwal', colorClass: 'text-[#D97706]' },
  ongoing: { label: 'Sedang Berlangsung', colorClass: 'text-[#16A34A]' },
  completed: { label: 'Selesai', colorClass: 'text-[#111C2D]' },
  archived: { label: 'Diarsipkan', colorClass: 'text-slate-400' },
};

const TYPE_LABELS: Record<string, string> = {
  pretest: 'Pretest',
  posttest: 'Posttest',
  paired: 'Paket Pretest-Posttest',
  single: 'Ujian Tunggal',
  quiz: 'Kuis',
  periodic: 'Evaluasi Berkala',
};

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    assessments,
    attempts,
    users,
    organizations,
    auditLogs,
    startOrResumeAttempt,
  } = useApp();
  const navigate = useNavigate();
  const [joinCodeInput, setJoinCodeInput] = useState('POST-BIO-26');

  // Filter data based on organization for non-superadmin
  const orgAssessments =
    currentUser.role === 'superadmin'
      ? assessments
      : assessments.filter((a) => a.organizationId === currentUser.organizationId);

  const orgAttempts =
    currentUser.role === 'superadmin'
      ? attempts
      : attempts.filter((att) => att.organizationId === currentUser.organizationId);

  const orgParticipants = users.filter(
    (u) =>
      u.role === 'participant' &&
      (currentUser.role === 'superadmin' || u.organizationId === currentUser.organizationId)
  );

  // Instructor / OrgAdmin metrics
  const totalActivities = orgAssessments.length;
  const activeActivities = orgAssessments.filter(
    (a) => a.status === 'ongoing' || a.status === 'ready' || a.status === 'scheduled'
  ).length;
  const draftActivities = orgAssessments.filter((a) => a.status === 'draft').length;
  const needsFinalizationCount = orgAttempts.filter((a) => a.isProvisional && a.status === 'submitted').length;
  const totalParticipants = orgParticipants.length;
  const totalAttemptsCount = orgAttempts.length;

  const finishedAttempts = orgAttempts.filter(
    (a) => a.status === 'graded' || a.status === 'submitted'
  );
  const avgScore =
    finishedAttempts.length > 0
      ? Math.round(
          finishedAttempts.reduce((acc, cur) => acc + cur.finalScore, 0) /
            finishedAttempts.length
        )
      : 0;
  const completionRate =
    totalAttemptsCount > 0
      ? Math.round((finishedAttempts.length / totalAttemptsCount) * 100)
      : 0;

  // Pretest vs Posttest comparison chart data
  const preAttempts = attempts.filter((a) => a.assessmentId === 'asm-bio-pretest');
  const postAttempts = attempts.filter((a) => a.assessmentId === 'asm-bio-posttest');
  const pairedComparison = pairPrePostAttempts(preAttempts, postAttempts, 100);

  const prePostChartData = pairedComparison.map((row) => ({
    name: row.participantName.split(' ')[0],
    Pretest: row.pretestScore ?? 0,
    Posttest: row.posttestScore ?? 0,
  }));

  // Participant specific view
  if (currentUser.role === 'participant') {
    const myAttempts = attempts.filter((a) => a.participantId === currentUser.uid);
    const availableAssessments = assessments.filter(
      (a) => a.status === 'ongoing' || a.status === 'ready' || a.status === 'scheduled'
    );

    return (
      <div className="space-y-8">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Beranda <span className="mx-1">/</span> Dashboard Peserta
            </div>
            <h1 className="text-2xl font-bold text-[#111C2D]">
              Halo, {currentUser.fullName}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Kode Peserta: <span className="font-mono-tabular font-semibold text-[#111C2D]">{currentUser.participantCode || 'PST-2026-001'}</span> · {currentUser.organizationName.replace(' [DATA DEMO]', '')}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCodeInput.trim()) {
                navigate(`/join/${encodeURIComponent(joinCodeInput.trim().toUpperCase())}`);
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="Masukkan kode ujian..."
              aria-label="Kode akses ujian"
              className="px-3.5 py-2 text-xs font-mono-tabular bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Akses Kode Ujian
            </button>
          </form>
        </div>

        {/* Participant Stat Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="text-xs text-slate-500">Ujian Tersedia</div>
            <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
              {availableAssessments.length}
            </div>
            <div className="text-xs text-[#4A7C59] mt-1">Siap dikerjakan</div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="text-xs text-slate-500">Sedang Dikerjakan</div>
            <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
              {myAttempts.filter((a) => a.status === 'in_progress').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Sesi tersimpan otomatis</div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="text-xs text-slate-500">Ujian Selesai</div>
            <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
              {myAttempts.filter((a) => a.status === 'graded' || a.status === 'submitted').length}
            </div>
            <div className="text-xs text-[#16A34A] mt-1">Terekam di riwayat</div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="text-xs text-slate-500">Rata-rata Nilai Saya</div>
            <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
              {myAttempts.length > 0
                ? Math.round(
                    myAttempts.reduce((s, a) => s + a.finalScore, 0) / myAttempts.length
                  )
                : 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Skala 0–100</div>
          </div>
        </div>

        {/* Available Exams for Participant */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#111C2D]">Daftar Ujian &amp; Kegiatan Anda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableAssessments.map((asm) => {
              const existingAttempt = myAttempts.find((a) => a.assessmentId === asm.id);
              return (
                <div
                  key={asm.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#4A7C59]">{TYPE_LABELS[asm.assessmentType]}</span>
                      <span>·</span>
                      <span className="font-mono-tabular">{asm.durationMinutes} Menit</span>
                      <span>·</span>
                      <span className="font-mono-tabular">{asm.questionIds.length} Soal</span>
                    </div>
                    <h3 className="text-base font-bold text-[#111C2D]">{asm.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{asm.description}</p>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Kode: <span className="font-mono-tabular font-semibold text-[#111C2D]">{asm.accessCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {existingAttempt && (existingAttempt.status === 'graded' || existingAttempt.status === 'submitted') && (
                        <Link
                          to={`/exam/${existingAttempt.id}/result`}
                          className="px-3 py-1.5 text-xs font-semibold text-[#111C2D] bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg hover:bg-slate-100"
                        >
                          Lihat Hasil ({existingAttempt.finalScore})
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const att = startOrResumeAttempt(asm.id);
                          navigate(`/exam/${att.id}`);
                        }}
                        className="px-4 py-1.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>
                          {existingAttempt?.status === 'in_progress'
                            ? 'Lanjutkan Ujian'
                            : 'Mulai Kerjakan'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score History Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#111C2D]">Riwayat Pengerjaan &amp; Nilai</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Nama Kegiatan</th>
                  <th className="py-3 px-4 font-semibold">Jenis</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Nilai Akhir</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {myAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-[#111C2D]">{att.assessmentTitle}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{TYPE_LABELS[att.assessmentType]}</td>
                    <td className="py-3 px-4 text-xs">
                      {att.status === 'graded'
                        ? 'Selesai & Dinilai'
                        : att.status === 'submitted'
                        ? 'Nilai Sementara (Esai Diproses)'
                        : 'Sedang Dikerjakan'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-bold text-[#111C2D]">
                      {att.finalScore}/100
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={
                          att.status === 'in_progress'
                            ? `/exam/${att.id}`
                            : `/exam/${att.id}/result`
                        }
                        className="text-xs font-semibold text-[#4A7C59] hover:underline"
                      >
                        {att.status === 'in_progress' ? 'Lanjutkan →' : 'Detail Hasil →'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span>{' '}
            {currentUser.role === 'superadmin'
              ? 'Ringkasan Operasional Platform'
              : 'Dashboard Instruktur & Penyelenggara'}
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">
            Selamat Datang, {currentUser.fullName}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {currentUser.jobTitle} · {currentUser.organizationName}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/question-bank/new"
            className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            + Tambah Butir Soal
          </Link>
          <Link
            to="/activities/new"
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kegiatan Baru</span>
          </Link>
        </div>
      </div>

      {/* Superadmin Platform Overview Banner (if Superadmin) */}
      {currentUser.role === 'superadmin' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111C2D]">
                Status Operasional Multi-Organisasi (Superadmin)
              </h2>
              <p className="text-xs text-slate-500">
                Pemantauan lintas organisasi, pengguna terdaftar, dan audit keamanan sistem.
              </p>
            </div>
            <Link
              to="/admin/organizations"
              className="text-xs font-semibold text-[#4A7C59] hover:underline"
            >
              Kelola Semua Organisasi →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0]">
              <div className="text-xs text-slate-500">Total Organisasi Aktif</div>
              <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
                {organizations.length}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0]">
              <div className="text-xs text-slate-500">Total Akun Pengguna</div>
              <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
                {users.length}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0]">
              <div className="text-xs text-slate-500">Total Kegiatan Lintas Instansi</div>
              <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
                {assessments.length}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0]">
              <div className="text-xs text-slate-500">Rekaman Audit Log</div>
              <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular mt-1">
                {auditLogs.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8 Core Instructor KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Total Kegiatan</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular">{totalActivities}</div>
          <div className="text-xs text-slate-500">Pretest, Posttest &amp; Evaluasi</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Kegiatan Aktif</div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono-tabular">{activeActivities}</div>
          <div className="text-xs text-slate-500">Siap / Sedang berlangsung</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Kegiatan Berstatus Draf</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular">{draftActivities}</div>
          <div className="text-xs text-slate-500">Dalam penyusunan soal</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Perlu Difinalisasi</div>
          <div className="text-2xl font-bold text-[#D97706] font-mono-tabular">{needsFinalizationCount}</div>
          <div className="text-xs text-[#D97706]">Menunggu penilaian esai manual</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Total Peserta Terdaftar</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular">{totalParticipants}</div>
          <div className="text-xs text-slate-500">Peserta aktif dalam kelompok</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Total Pengerjaan</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular">{totalAttemptsCount}</div>
          <div className="text-xs text-slate-500">Sesi ujian terekam</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Rata-rata Nilai</div>
          <div className="text-2xl font-bold text-[#4A7C59] font-mono-tabular">{avgScore}/100</div>
          <div className="text-xs text-slate-500">Akumulasi seluruh asesmen</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-500">Persentase Penyelesaian</div>
          <div className="text-2xl font-bold text-[#111C2D] font-mono-tabular">{completionRate}%</div>
          <div className="text-xs text-[#16A34A]">Tingkat ketuntasan sesi</div>
        </div>
      </div>

      {/* Pretest vs Posttest Chart & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Pretest vs Posttest Chart */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#111C2D]">
                Ringkasan Perbandingan Pretest vs Posttest
              </h2>
              <p className="text-xs text-slate-500">
                Program Pembelajaran Biologi Molekuler Kelas XII MIPA 1 [DATA DEMO]
              </p>
            </div>
            <Link
              to="/results"
              className="text-xs font-semibold text-[#4A7C59] hover:underline flex items-center gap-1"
            >
              <span>Analisis N-Gain Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prePostChartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Pretest" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Posttest" fill="#4A7C59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div>
              Rata-rata Pretest: <span className="font-mono-tabular font-bold text-[#111C2D]">51,3</span> · Rata-rata Posttest: <span className="font-mono-tabular font-bold text-[#4A7C59]">84,3</span>
            </div>
            <div>
              Peningkatan Rata-rata: <span className="font-mono-tabular font-bold text-[#16A34A]">+33,0 Poin (N-Gain 0,68 · Sedang-Tinggi)</span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Recent Participant Activity & Pending Grading */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111C2D]">Aktivitas Peserta Terbaru</h2>
              <Link to="/activities/asm-bio-posttest/command-center" className="text-xs font-semibold text-[#4A7C59] hover:underline">
                Command Center →
              </Link>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {orgAttempts.slice(0, 4).map((att) => (
                <div key={att.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-[#111C2D]">
                      {att.participantName}{' '}
                      <span className="font-mono-tabular font-normal text-slate-500">
                        ({att.participantCode})
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 truncate max-w-[230px]">
                      {att.assessmentTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {att.status === 'in_progress' ? (
                        <span className="text-[#D97706] font-medium">
                          Sedang mengerjakan · Sisa {Math.ceil(att.remainingSeconds / 60)} menit
                        </span>
                      ) : att.isProvisional ? (
                        <span className="text-[#D97706] font-medium">
                          Menunggu penilaian esai manual
                        </span>
                      ) : (
                        <span className="text-[#16A34A] font-medium">
                          Selesai dinilai · Skor {att.finalScore}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/activities/${att.assessmentId}/command-center`}
                    className="px-2.5 py-1 text-xs font-medium text-[#111C2D] bg-[#F8F9F7] border border-[#E2E8F0] rounded-md hover:bg-slate-100 shrink-0"
                  >
                    Pantau
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0]">
            <div className="text-xs font-semibold text-[#111C2D] mb-1">
              Jadwal Kegiatan Mendatang
            </div>
            <div className="text-xs text-slate-600 flex items-center justify-between">
              <span>Kuis Evaluasi Cepat Kinetika Enzim</span>
              <span className="font-mono-tabular text-slate-500">28 Okt 2026 · 08:00 WIB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#111C2D]">
              Kegiatan Asesmen Terbaru &amp; Sedang Berlangsung
            </h2>
            <p className="text-xs text-slate-500">
              Setiap kegiatan dilengkapi Command Center pemantauan langsung dan snapshot versi soal.
            </p>
          </div>
          <Link
            to="/activities"
            className="text-xs font-semibold text-[#4A7C59] hover:underline"
          >
            Lihat Semua Kegiatan ({orgAssessments.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgAssessments.slice(0, 6).map((asm) => {
            const asmAttempts = attempts.filter((a) => a.assessmentId === asm.id);
            const statusInfo = STATUS_LABELS[asm.status] || STATUS_LABELS.draft;

            return (
              <div
                key={asm.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-5 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2.5">
                  {/* Unboxed clean metadata */}
                  <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-[#111C2D]">
                      {TYPE_LABELS[asm.assessmentType]}
                    </span>
                    <span>·</span>
                    <span className={`font-semibold ${statusInfo.colorClass}`}>
                      {statusInfo.label}
                    </span>
                    <span>·</span>
                    <span className="font-mono-tabular">Versi {asm.version}</span>
                  </div>

                  <Link
                    to={`/activities/${asm.id}`}
                    className="block text-base font-bold text-[#111C2D] hover:text-[#4A7C59] transition-colors leading-snug"
                  >
                    {asm.title}
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {asm.description}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400">Tanggal</div>
                      <div className="font-mono-tabular font-medium text-[#111C2D]">
                        {asm.startTime.slice(0, 10)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Jumlah Soal</div>
                      <div className="font-mono-tabular font-medium text-[#111C2D]">
                        {asm.questionIds.length} Butir
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Peserta</div>
                      <div className="font-mono-tabular font-medium text-[#111C2D]">
                        {Math.max(asm.assignedParticipantIds.length, asmAttempts.length)} Orang
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Link
                      to={`/activities/${asm.id}/command-center`}
                      className="flex-1 py-2 px-3 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg text-center transition-colors whitespace-nowrap"
                    >
                      Buka Command Center
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        const att = startOrResumeAttempt(asm.id);
                        navigate(`/exam/${att.id}`);
                      }}
                      className="py-2 px-3 bg-[#F8F9F7] hover:bg-slate-100 text-[#111C2D] border border-[#E2E8F0] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      Uji Coba
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
