import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileUp,
  LayoutGrid,
  List,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Assessment,
  AssessmentStatus,
  AssessmentType,
  DifficultyLevel,
  EducationLevel,
  Question,
  QuestionType,
} from '../types/assessment';
import {
  DEFAULT_TEMPLATE_ROWS,
  SPREADSHEET_COLUMNS,
  SpreadsheetQuestionRow,
  convertSpreadsheetRowsToQuestions,
  downloadCsvQuestionTemplate,
  downloadExcelQuestionTemplate,
  parseDelimitedTextToRows,
  parseExcelBufferToRows,
} from '../utils/excelTemplate';
import { addQuestionTag, getEffectiveQuestionTags } from '../utils/questionTags';
import { buildParticipantJoinUrl } from '../utils/shareAssessmentLink';

const STATUS_TABS: { key: 'all' | AssessmentStatus; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'ready', label: 'Siap Diujikan' },
  { key: 'draft', label: 'Draf' },
  { key: 'scheduled', label: 'Terjadwal' },
  { key: 'ongoing', label: 'Sedang Berlangsung' },
  { key: 'completed', label: 'Selesai' },
  { key: 'archived', label: 'Diarsipkan' },
];

const STATUS_LABELS: Record<AssessmentStatus, { label: string; color: string }> = {
  draft: { label: 'Draf', color: 'text-slate-600' },
  ready: { label: 'Siap Diujikan', color: 'text-[#4A7C59]' },
  scheduled: { label: 'Terjadwal', color: 'text-[#D97706]' },
  ongoing: { label: 'Sedang Berlangsung', color: 'text-[#16A34A]' },
  completed: { label: 'Selesai', color: 'text-[#111C2D]' },
  archived: { label: 'Diarsipkan', color: 'text-slate-400' },
};

const TYPE_LABELS: Record<AssessmentType, string> = {
  pretest: 'Pretest',
  posttest: 'Posttest',
  paired: 'Paket Pretest & Posttest',
  single: 'Ujian Tunggal',
  quiz: 'Kuis',
  periodic: 'Evaluasi Berkala',
};

export const ActivitiesListPage: React.FC = () => {
  const {
    currentUser,
    assessments,
    organizations,
    globalSearch,
    duplicateAssessment,
    archiveAssessment,
    restoreAssessment,
    deleteAssessment,
    startOrResumeAttempt,
    addToast,
  } = useApp();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [activeTab, setActiveTab] = useState<'all' | AssessmentStatus>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'questions'>('newest');
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const combinedSearch = (localSearch || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return assessments
      .filter((a) => {
        if (currentUser.role !== 'superadmin' && a.organizationId !== currentUser.organizationId) {
          return false;
        }
        if (activeTab !== 'all' && a.status !== activeTab) return false;
        if (typeFilter !== 'all' && a.assessmentType !== typeFilter) return false;
        if (orgFilter !== 'all' && a.organizationId !== orgFilter) return false;
        if (
          combinedSearch &&
          !a.title.toLowerCase().includes(combinedSearch) &&
          !a.subject.toLowerCase().includes(combinedSearch) &&
          !a.accessCode.toLowerCase().includes(combinedSearch)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'questions') return b.questionIds.length - a.questionIds.length;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [assessments, currentUser, activeTab, typeFilter, orgFilter, combinedSearch, sortBy]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExportListCsv = () => {
    const headers = ['ID', 'Judul', 'Jenis', 'Status', 'Jenjang', 'Jumlah Soal', 'Durasi (Menit)', 'Kode Akses'];
    const rows = filtered.map((a) => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      TYPE_LABELS[a.assessmentType],
      STATUS_LABELS[a.status].label,
      a.educationLevel,
      String(a.questionIds.length),
      String(a.durationMinutes),
      a.accessCode,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daftar-kegiatan-askia-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Daftar Kegiatan Diekspor', 'File CSV daftar kegiatan berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span> Kegiatan Asesmen
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">Daftar Kegiatan Asesmen</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Kelola kegiatan pretest, posttest, kuis, dan evaluasi kompetensi beserta jadwal dan aturan ujian.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportListCsv}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          {currentUser.role !== 'participant' && (
            <Link
              to="/activities/new"
              className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Kegiatan Baru</span>
            </Link>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto bg-white p-1.5 rounded-xl border border-[#E2E8F0]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.key
                ? 'bg-[#4A7C59] text-white'
                : 'text-slate-600 hover:text-[#111C2D] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter, Search, Sort, and View Toggle Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari judul kegiatan atau kode akses..."
              aria-label="Cari judul kegiatan"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter jenis asesmen"
            className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
          >
            <option value="all">Semua Jenis Asesmen</option>
            <option value="pretest">Pretest</option>
            <option value="posttest">Posttest</option>
            <option value="paired">Paket Pretest &amp; Posttest</option>
            <option value="single">Ujian Tunggal</option>
            <option value="quiz">Kuis</option>
            <option value="periodic">Evaluasi Berkala</option>
          </select>

          {currentUser.role === 'superadmin' && (
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              aria-label="Filter organisasi"
              className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            >
              <option value="all">Semua Organisasi</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Urutkan kegiatan"
            className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
          >
            <option value="newest">Urutkan: Terbaru Diperbarui</option>
            <option value="title">Urutkan: Judul (A–Z)</option>
            <option value="questions">Urutkan: Jumlah Soal Terbanyak</option>
          </select>
        </div>

        {/* View Mode Switcher: Card vs Table */}
        <div className="flex items-center gap-1 bg-[#F8F9F7] p-1 rounded-lg border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 ${
              viewMode === 'card'
                ? 'bg-white text-[#111C2D] shadow-xs font-semibold'
                : 'text-slate-500 hover:text-[#111C2D]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kartu</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white text-[#111C2D] shadow-xs font-semibold'
                : 'text-slate-500 hover:text-[#111C2D]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Tabel</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {paginated.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center space-y-3">
          <div className="text-base font-bold text-[#111C2D]">
            Tidak Ada Kegiatan Asesmen yang Cocok
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ubah filter status atau kata kunci pencarian Anda, atau buat kegiatan asesmen baru.
          </p>
          <Link
            to="/activities/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A7C59] text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kegiatan Pertama</span>
          </Link>
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginated.map((asm) => {
            const st = STATUS_LABELS[asm.status];
            return (
              <div
                key={asm.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-[#111C2D]">{TYPE_LABELS[asm.assessmentType]}</span>
                    <span>·</span>
                    <span className={`font-semibold ${st.color}`}>{st.label}</span>
                    <span>·</span>
                    <span>{asm.educationLevel}</span>
                  </div>

                  <Link
                    to={`/activities/${asm.id}`}
                    className="block text-base font-bold text-[#111C2D] hover:text-[#4A7C59] transition-colors"
                  >
                    {asm.title}
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2">{asm.description}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Kode: <strong className="font-mono-tabular text-[#111C2D]">{asm.accessCode}</strong>
                    </span>
                    <span className="font-mono-tabular">
                      {asm.questionIds.length} Soal · {asm.durationMinutes} Menit · V{asm.version}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/activities/${asm.id}/command-center`}
                      className="flex-1 py-2 px-3 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg text-center transition-colors whitespace-nowrap"
                    >
                      Buka Command Center
                    </Link>

                    {currentUser.role !== 'participant' && (
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/activities/${asm.id}/edit`}
                          className="p-2 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                          aria-label={`Edit ${asm.title}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => duplicateAssessment(asm.id)}
                          className="p-2 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                          aria-label={`Duplikasi ${asm.title}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {asm.status === 'archived' ? (
                          <button
                            type="button"
                            onClick={() => restoreAssessment(asm.id)}
                            className="p-2 rounded-lg border border-[#E2E8F0] text-[#4A7C59] hover:bg-slate-50"
                            aria-label={`Pulihkan ${asm.title}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archiveAssessment(asm.id)}
                            className="p-2 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                            aria-label={`Arsipkan ${asm.title}`}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(asm.id)}
                          className="p-2 rounded-lg border border-[#E2E8F0] text-[#DC2626] hover:bg-red-50"
                          aria-label={`Hapus ${asm.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Judul Kegiatan</th>
                  <th className="py-3 px-4 font-semibold">Jenis</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Jenjang</th>
                  <th className="py-3 px-4 font-semibold text-right">Soal</th>
                  <th className="py-3 px-4 font-semibold text-right">Durasi</th>
                  <th className="py-3 px-4 font-semibold">Kode Akses</th>
                  <th className="py-3 px-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {paginated.map((asm) => {
                  const st = STATUS_LABELS[asm.status];
                  return (
                    <tr key={asm.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-[#111C2D]">
                        <Link to={`/activities/${asm.id}`} className="hover:text-[#4A7C59]">
                          {asm.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{TYPE_LABELS[asm.assessmentType]}</td>
                      <td className={`py-3 px-4 text-xs font-semibold ${st.color}`}>{st.label}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{asm.educationLevel}</td>
                      <td className="py-3 px-4 text-xs text-right font-mono-tabular">{asm.questionIds.length}</td>
                      <td className="py-3 px-4 text-xs text-right font-mono-tabular">{asm.durationMinutes} mnt</td>
                      <td className="py-3 px-4 text-xs font-mono-tabular font-semibold">{asm.accessCode}</td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          to={`/activities/${asm.id}/command-center`}
                          className="text-xs font-semibold text-[#4A7C59] hover:underline"
                        >
                          Command Center
                        </Link>
                        {currentUser.role !== 'participant' && (
                          <>
                            <Link
                              to={`/activities/${asm.id}/edit`}
                              className="text-xs text-slate-600 hover:text-[#111C2D]"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(asm.id)}
                              className="text-xs text-[#DC2626] hover:underline"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
        <div>
          Menampilkan <span className="font-mono-tabular font-semibold">{paginated.length}</span> dari{' '}
          <span className="font-mono-tabular font-semibold">{filtered.length}</span> kegiatan asesmen
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="font-mono-tabular">
            Halaman {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[#111C2D]">Konfirmasi Penghapusan Kegiatan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus kegiatan ini? Untuk mempertahankan riwayat akademik,
              disarankan menggunakan fitur <strong>Arsipkan</strong> apabila kegiatan sudah memiliki hasil ujian peserta.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAssessment(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#DC2626] rounded-lg hover:bg-red-700"
              >
                Ya, Hapus Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WIZARD_STEPS = [
  { num: 1, title: 'Informasi Kegiatan' },
  { num: 2, title: 'Jenis Asesmen' },
  { num: 3, title: 'Pengaturan Soal' },
  { num: 4, title: 'Peserta & Jadwal' },
  { num: 5, title: 'Pengaturan Hasil' },
  { num: 6, title: 'Pratinjau & Publikasi' },
];

const QUESTION_TEMPLATE_PACKS: {
  id: string;
  title: string;
  badge: string;
  level: EducationLevel;
  description: string;
  items: Partial<Question>[];
}[] = [
  {
    id: 'tpl-pack-sekolah',
    title: 'Template Pretest–Posttest Literasi & Numerasi Sekolah',
    badge: 'SD / SMP / SMA / SMK',
    level: 'SMA/SMK/MA',
    description:
      'Paket 3 butir soal standar evaluasi pembelajaran sekolah mencakup Pilihan Ganda Konseptual, Jawaban Numerik, dan Isian Singkat.',
    items: [
      {
        prompt:
          '[Template Literasi Sains] Manakah variabel bebas yang tepat dalam percobaan pengaruh intensitas cahaya terhadap laju pertumbuhan kecambah?',
        questionType: 'single_choice',
        options: [
          { id: 'tpl-s1-a', label: 'A', text: 'Intensitas cahaya yang diberikan pada tanaman' },
          { id: 'tpl-s1-b', label: 'B', text: 'Tinggi batang kecambah setelah 7 hari' },
          { id: 'tpl-s1-c', label: 'C', text: 'Jenis biji kacang hijau yang digunakan' },
          { id: 'tpl-s1-d', label: 'D', text: 'Volume air penyiraman harian' },
        ],
        correctOptionIds: ['tpl-s1-a'],
        points: 10,
        category: 'Literasi Sains',
        topic: 'Metode Ilmiah',
        difficulty: 'mudah',
        explanation:
          'Variabel bebas adalah faktor yang sengaja diubah/dimanipulasi oleh peneliti, yaitu intensitas cahaya.',
      },
      {
        prompt:
          '[Template Numerasi] Sebuah kelas memiliki 30 siswa dengan nilai rata-rata Pretest 60. Jika setelah pembelajaran nilai rata-rata Posttest meningkat menjadi 80, berapakah nilai N-Gain kelas tersebut (skor maksimum 100)?',
        questionType: 'numeric',
        correctNumericValue: 0.5,
        numericTolerance: 0.02,
        points: 15,
        category: 'Numerasi & Statistika',
        topic: 'Evaluasi N-Gain',
        difficulty: 'sedang',
        explanation: 'N-Gain = (Posttest - Pretest) / (100 - Pretest) = (80 - 60) / (100 - 60) = 20 / 40 = 0,50.',
      },
      {
        prompt:
          '[Template Konsep Dasar] Sebutkan istilah proses perpindahan molekul pelarut (air) melalui membran semipermeabel dari konsentrasi rendah ke konsentrasi tinggi!',
        questionType: 'short_answer',
        correctShortAnswers: ['Osmosis', 'osmosis'],
        points: 10,
        category: 'Sains Dasar',
        topic: 'Transpor Membran',
        difficulty: 'mudah',
        explanation: 'Osmosis adalah perpindahan molekul pelarut melewati membran semipermeabel.',
      },
    ],
  },
  {
    id: 'tpl-pack-pelatihan',
    title: 'Template Evaluasi Pelatihan, Bimtek & Diklat Instansi',
    badge: 'Pelatihan / Pemerintah / Korporasi',
    level: 'Instansi Pemerintah',
    description:
      'Paket 3 butir soal untuk mengukur peningkatan kompetensi peserta bimbingan teknis, seminar, workshop, dan diklat pegawai.',
    items: [
      {
        prompt:
          '[Template Kompetensi Pelatihan] Dalam siklus manajemen program berbasis kinerja (PDCA), tahapan evaluasi kesesuaian antara target indikator dengan realisasi lapangan berada pada fase...',
        questionType: 'single_choice',
        options: [
          { id: 'tpl-p1-a', label: 'A', text: 'Plan (Perencanaan Standar)' },
          { id: 'tpl-p1-b', label: 'B', text: 'Do (Pelaksanaan Operasional)' },
          { id: 'tpl-p1-c', label: 'C', text: 'Check (Pemantauan & Evaluasi)' },
          { id: 'tpl-p1-d', label: 'D', text: 'Act (Tindak Lanjut Perbaikan)' },
        ],
        correctOptionIds: ['tpl-p1-c'],
        points: 10,
        category: 'Manajemen & Tata Kelola',
        topic: 'Evaluasi Kinerja',
        difficulty: 'mudah',
        explanation: 'Tahap Check berfokus pada pengukuran dan evaluasi capaian terhadap target perencanaan.',
      },
      {
        prompt:
          '[Template Regulasi & Etika] Setiap dokumen digital yang ditandatangani menggunakan sertifikat elektronik tersertifikasi memiliki kekuatan hukum yang sah setara dokumen fisik.',
        questionType: 'true_false',
        options: [
          { id: 'tpl-p2-true', label: 'Benar', text: 'Pernyataan Benar' },
          { id: 'tpl-p2-false', label: 'Salah', text: 'Pernyataan Salah' },
        ],
        correctOptionIds: ['tpl-p2-true'],
        points: 10,
        category: 'Transformasi Digital',
        topic: 'Keamanan Informasi',
        difficulty: 'mudah',
        explanation: 'Sesuai UU ITE dan regulasi SPBE, tanda tangan elektronik tersertifikasi memiliki kekuatan hukum sah.',
      },
      {
        prompt:
          '[Template Esai Action Plan] Uraikan rencana tindak lanjut (Action Plan) yang akan Anda terapkan di unit kerja Anda dalam 30 hari pertama setelah mengikuti pelatihan ini!',
        questionType: 'essay',
        rubric: [
          {
            id: 'rub-tpl-1',
            criterion: 'Kejelasan Indikator Output & Jadwal Pelaksanaan',
            maxPoints: 10,
            description: 'Menyebutkan target terukur dan lini masa 30 hari secara konkret.',
          },
          {
            id: 'rub-tpl-2',
            criterion: 'Relevansi dengan Materi Pelatihan & Kolaborasi Tim',
            maxPoints: 10,
            description: 'Mengaitkan materi pelatihan dengan pemecahan masalah nyata di unit kerja.',
          },
        ],
        points: 20,
        category: 'Evaluasi Pascapelatihan',
        topic: 'Rencana Tindak Lanjut',
        difficulty: 'sulit',
        explanation: 'Dinilai secara manual oleh instruktur berdasarkan rubrik Action Plan peserta.',
      },
    ],
  },
  {
    id: 'tpl-pack-kampus',
    title: 'Template Ujian Akademik & Metodologi Perguruan Tinggi',
    badge: 'Perguruan Tinggi / Dosen',
    level: 'Perguruan Tinggi',
    description:
      'Paket 3 butir soal akademik mencakup Pilihan Ganda Kompleks (Multi-Jawaban), Studi Kasus Analitis, dan Perhitungan Statistik.',
    items: [
      {
        prompt:
          '[Template Metodologi Riset] Manakah di antara syarat berikut yang harus dipenuhi untuk menggunakan uji parametrik Paired Sample t-Test pada evaluasi Pretest dan Posttest? (Pilih semua yang benar)',
        questionType: 'multiple_choice',
        complexScoringRule: 'partial_credit',
        options: [
          { id: 'tpl-k1-a', label: 'A', text: 'Data selisih skor berdistribusi normal' },
          { id: 'tpl-k1-b', label: 'B', text: 'Skala pengukuran data minimal interval atau rasio' },
          { id: 'tpl-k1-c', label: 'C', text: 'Pengukuran dilakukan pada subjek peserta yang sama (berpasangan)' },
          { id: 'tpl-k1-d', label: 'D', text: 'Jumlah sampel wajib kurang dari 5 responden' },
        ],
        correctOptionIds: ['tpl-k1-a', 'tpl-k1-b', 'tpl-k1-c'],
        points: 15,
        category: 'Metodologi Penelitian',
        topic: 'Statistika Inferensial',
        difficulty: 'sedang',
        explanation: 'Uji t berpasangan mensyaratkan subjek berpasangan, skala interval/rasio, dan normalitas selisih skor.',
      },
      {
        prompt:
          '[Template Statistika] Jika nilai rata-rata sampel adalah 82, nilai tengah (median) adalah 80, dan simpangan baku adalah 4, berapakah selisih antara rata-rata dan median?',
        questionType: 'numeric',
        correctNumericValue: 2,
        numericTolerance: 0,
        points: 10,
        category: 'Statistika Akademik',
        topic: 'Ukuran Pemusatan Data',
        difficulty: 'mudah',
        explanation: 'Selisih antara Mean (82) dan Median (80) adalah 82 - 80 = 2.',
      },
    ],
  },
];

const SINGLE_TYPE_TEMPLATES: {
  label: string;
  type: QuestionType;
  prompt: string;
  options: [string, string, string, string];
  correctIdx: number;
  shortAnswer: string;
  numericVal: number;
  points: number;
  explanation: string;
}[] = [
  {
    label: 'Template Pilihan Ganda (HOTS)',
    type: 'single_choice',
    prompt: 'Berdasarkan analisis data pada kasus di atas, faktor utama yang paling menentukan keberhasilan intervensi adalah...',
    options: [
      'Konsistensi pelaksanaan standar operasional dan pemantauan berkala',
      'Pengurangan seluruh tahapan verifikasi mutu',
      'Penghapusan dokumentasi evaluasi awal',
      'Pengabaian umpan balik dari peserta kegiatan',
    ],
    correctIdx: 0,
    shortAnswer: '',
    numericVal: 0,
    points: 10,
    explanation: 'Konsistensi pelaksanaan SOP dan evaluasi berkala merupakan kunci utama keberhasilan intervensi.',
  },
  {
    label: 'Template Benar / Salah',
    type: 'true_false',
    prompt: 'Evaluasi Pretest dilaksanakan sebelum materi pembelajaran diberikan untuk memetakan kemampuan awal peserta.',
    options: ['Pernyataan Benar', 'Pernyataan Salah', '', ''],
    correctIdx: 0,
    shortAnswer: '',
    numericVal: 0,
    points: 10,
    explanation: 'Pernyataan Benar. Pretest bertujuan mengukur baseline pengetahuan awal peserta.',
  },
  {
    label: 'Template Isian Singkat',
    type: 'short_answer',
    prompt: 'Sebutkan singkatan dari indeks peningkatan nilai terstandar yang digunakan untuk membandingkan skor Pretest dan Posttest (tulis: N-Gain)!',
    options: ['', '', '', ''],
    correctIdx: 0,
    shortAnswer: 'N-Gain',
    numericVal: 0,
    points: 10,
    explanation: 'Indeks Normalized Gain (N-Gain) mengukur peningkatan pemahaman konsep secara proporsional.',
  },
  {
    label: 'Template Jawaban Angka (Numerik)',
    type: 'numeric',
    prompt: 'Jika seorang peserta memperoleh nilai Pretest 50 dan nilai Posttest 85 dari skor maksimum 100, berapakah selisih kenaikan nilainya (Delta)?',
    options: ['', '', '', ''],
    correctIdx: 0,
    shortAnswer: '',
    numericVal: 35,
    points: 10,
    explanation: 'Selisih nilai (Delta) = Nilai Posttest (85) - Nilai Pretest (50) = 35.',
  },
  {
    label: 'Template Soal Esai / Uraian',
    type: 'essay',
    prompt: 'Jelaskan secara sistematis 3 langkah strategis untuk mengoptimalkan hasil evaluasi pembelajaran berdasarkan temuan Pretest dan Posttest!',
    options: ['', '', '', ''],
    correctIdx: 0,
    shortAnswer: '',
    numericVal: 0,
    points: 20,
    explanation: 'Dinilai berdasarkan kelengkapan argumen, ketepatan konsep, dan contoh implementasi.',
  },
];

export const ActivityWizardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentUser,
    assessments,
    questions,
    groups,
    users,
    saveAssessment,
    saveQuestion,
    importQuestionsBatch,
    addToast,
  } = useApp();

  const existing = assessments.find((a) => a.id === id);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [objective, setObjective] = useState(existing?.objective || '');
  const [organizer, setOrganizer] = useState(
    existing?.organizer || currentUser.organizationName.replace(' [DATA DEMO]', '')
  );
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    existing?.educationLevel || 'SMA/SMK/MA'
  );
  const [subject, setSubject] = useState(existing?.subject || '');
  const [category, setCategory] = useState(existing?.category || 'Sains & STEM');
  const [language, setLanguage] = useState(existing?.language || 'Bahasa Indonesia');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(existing?.difficulty || 'sedang');

  // Step 2
  const [assessmentType, setAssessmentType] = useState<AssessmentType>(
    existing?.assessmentType || 'pretest'
  );
  const [pairedAssessmentId, setPairedAssessmentId] = useState(
    existing?.pairedAssessmentId || ''
  );

  // Step 3: Question Sourcing Mode ('create' | 'template' | 'import' | 'bank')
  const [questionSourceTab, setQuestionSourceTab] = useState<
    'create' | 'template' | 'import' | 'bank'
  >('create');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    existing?.questionIds || ['q-bio-01', 'q-bio-02', 'q-bio-03', 'q-bio-04', 'q-bio-05']
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(existing?.shuffleQuestions ?? false);
  const [shuffleOptions, setShuffleOptions] = useState(existing?.shuffleOptions ?? false);
  const [requireAllQuestions, setRequireAllQuestions] = useState(
    existing?.requireAllQuestions ?? true
  );

  // Quick 1-line question state (preserved)
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickPoints, setQuickPoints] = useState(10);

  // Full Direct Question Builder state inside Wizard
  const [directType, setDirectType] = useState<QuestionType>('single_choice');
  const [directPrompt, setDirectPrompt] = useState('');
  const [directOptA, setDirectOptA] = useState('Pilihan Jawaban A (Benar)');
  const [directOptB, setDirectOptB] = useState('Pilihan Jawaban B');
  const [directOptC, setDirectOptC] = useState('Pilihan Jawaban C');
  const [directOptD, setDirectOptD] = useState('Pilihan Jawaban D');
  const [directCorrectIdx, setDirectCorrectIdx] = useState<number>(0);
  const [directShortAnswer, setDirectShortAnswer] = useState('AUG');
  const [directNumericVal, setDirectNumericVal] = useState<number>(10);
  const [directNumericTol, setDirectNumericTol] = useState<number>(0.1);
  const [directPoints, setDirectPoints] = useState<number>(10);
  const [directDifficulty, setDirectDifficulty] = useState<DifficultyLevel>('sedang');
  const [directTopicTags, setDirectTopicTags] = useState<string>('Evaluasi Kompetensi, HOTS');
  const [directExplanation, setDirectExplanation] = useState('');
  const [directIsDraft, setDirectIsDraft] = useState<boolean>(false);

  // Import & Template Spreadsheet Soal inside Wizard state
  const wizardFileInputRef = useRef<HTMLInputElement | null>(null);
  const [wizImportFormat, setWizImportFormat] = useState<'excel_table' | 'csv' | 'json'>('excel_table');
  const [wizSpreadsheetRows, setWizSpreadsheetRows] = useState<SpreadsheetQuestionRow[]>(() =>
    DEFAULT_TEMPLATE_ROWS.map((r) => ({ ...r }))
  );
  const [wizImportText, setWizImportText] = useState(
    `prompt;questionType;optionA;optionB;optionC;optionD;correctAnswer;points;explanation\nManakah gas utama yang dihasilkan oleh proses fotosintesis tumbuhan hijau?;single_choice;Oksigen (O2);Nitrogen (N2);Karbon Monoksida (CO);Hidrogen (H2);A;10;Fotosintesis melepaskan oksigen (O2) sebagai hasil fotolisis molekul air.\nApakah evaluasi Pretest dilakukan sebelum materi pelatihan diberikan kepada peserta?;true_false;Pernyataan Benar;Pernyataan Salah;;;A;10;Pretest dilakukan di awal sebelum intervensi pembelajaran dimulai.`
  );
  const [wizImportResult, setWizImportResult] = useState<{
    imported: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  const handleUpdateSpreadsheetCell = (
    rowIndex: number,
    key: keyof SpreadsheetQuestionRow,
    value: string | number
  ) => {
    setWizSpreadsheetRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? {
              ...row,
              [key]: key === 'points' ? Number(value) || 0 : String(value),
            }
          : row
      )
    );
  };

  const handleAddSpreadsheetRow = () => {
    setWizSpreadsheetRows((prev) => [
      ...prev,
      {
        prompt: '',
        questionType: 'single_choice',
        optionA: 'Pilihan A',
        optionB: 'Pilihan B',
        optionC: 'Pilihan C',
        optionD: 'Pilihan D',
        correctAnswer: 'A',
        points: 10,
        explanation: '',
      },
    ]);
  };

  const handleRemoveSpreadsheetRow = (rowIndex: number) => {
    setWizSpreadsheetRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
  };

  // Step 4
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>(
    existing?.assignedGroupIds || ['grp-xii-mipa1']
  );
  const [assignedParticipantIds, setAssignedParticipantIds] = useState<string[]>(
    existing?.assignedParticipantIds || ['user-participant-1', 'user-participant-2']
  );
  const [startTime, setStartTime] = useState(
    existing?.startTime ? existing.startTime.slice(0, 16) : '2026-10-24T08:00'
  );
  const [endTime, setEndTime] = useState(
    existing?.endTime ? existing.endTime.slice(0, 16) : '2026-10-30T17:00'
  );
  const [durationMinutes, setDurationMinutes] = useState(existing?.durationMinutes || 60);
  const [maxAttempts, setMaxAttempts] = useState(existing?.maxAttempts || 1);
  const [accessCode, setAccessCode] = useState(
    existing?.accessCode || `ASKIA-${Math.floor(100 + Math.random() * 899)}`
  );
  const [examToken, setExamToken] = useState(existing?.examToken || 'TOKEN26');
  const [latePolicy, setLatePolicy] = useState<'strict' | 'allow_with_deduction' | 'flexible'>(
    existing?.latePolicy || 'strict'
  );

  // Step 5
  const [autoPublishResult, setAutoPublishResult] = useState(
    existing?.autoPublishResult ?? true
  );
  const [showExplanation, setShowExplanation] = useState(existing?.showExplanation ?? true);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(
    existing?.showCorrectAnswer ?? true
  );
  const [passingScore, setPassingScore] = useState(existing?.passingScore ?? 70);

  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const toggleQuestionId = (qid: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qid) ? prev.filter((x) => x !== qid) : [...prev, qid]
    );
  };

  const handleQuickAddQuestion = () => {
    if (quickPrompt.trim().length < 5) {
      addToast('error', 'Pertanyaan Terlalu Pendek', 'Tuliskan teks pertanyaan minimal 5 karakter.');
      return;
    }
    const newQ = saveQuestion({
      id: `q-wiz-${Date.now()}`,
      ownerId: currentUser.uid,
      authorName: currentUser.fullName,
      organizationId: currentUser.organizationId,
      prompt: quickPrompt.trim(),
      questionType: 'single_choice',
      options: [
        { id: 'opt-a', label: 'A', text: 'Pernyataan A (Benar)' },
        { id: 'opt-b', label: 'B', text: 'Pernyataan B' },
        { id: 'opt-c', label: 'C', text: 'Pernyataan C' },
        { id: 'opt-d', label: 'D', text: 'Pernyataan D' },
      ],
      correctOptionIds: ['opt-a'],
      points: quickPoints,
      explanation: 'Pembahasan soal yang dibuat melalui wizard kegiatan.',
      category: category || 'Umum',
      topic: subject || 'Evaluasi',
      difficulty,
      educationLevel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setSelectedQuestionIds((prev) => [...prev, newQ.id]);
    setQuickPrompt('');
  };

  const handleDirectCreateQuestion = () => {
    const trimmedPrompt = directPrompt.trim();
    if (!directIsDraft && trimmedPrompt.length < 5) {
      addToast(
        'error',
        'Pertanyaan Belum Lengkap',
        'Tuliskan pokok pertanyaan minimal 5 karakter untuk dipublikasikan, atau aktifkan "Save as Draft".'
      );
      return;
    }
    const finalPrompt =
      trimmedPrompt.length > 0
        ? trimmedPrompt
        : '[Draf Soal Sedang Disusun — Belum Ada Teks Pertanyaan]';
    const now = new Date().toISOString();
    const qId = `q-direct-${Date.now()}`;
    const opts =
      directType === 'true_false'
        ? [
            { id: `${qId}-true`, label: 'Benar', text: 'Pernyataan Benar' },
            { id: `${qId}-false`, label: 'Salah', text: 'Pernyataan Salah' },
          ]
        : [
            { id: `${qId}-a`, label: 'A', text: directOptA.trim() || 'Pilihan A' },
            { id: `${qId}-b`, label: 'B', text: directOptB.trim() || 'Pilihan B' },
            { id: `${qId}-c`, label: 'C', text: directOptC.trim() || 'Pilihan C' },
            { id: `${qId}-d`, label: 'D', text: directOptD.trim() || 'Pilihan D' },
          ];

    const selectedCorrectOpt =
      directType === 'true_false'
        ? [opts[directCorrectIdx === 1 ? 1 : 0].id]
        : [opts[Math.min(Math.max(directCorrectIdx, 0), opts.length - 1)].id];

    const created = saveQuestion({
      id: qId,
      ownerId: currentUser.uid,
      authorName: currentUser.fullName,
      organizationId: currentUser.organizationId,
      prompt: finalPrompt,
      questionType: directType,
      options:
        directType === 'single_choice' ||
        directType === 'multiple_choice' ||
        directType === 'true_false' ||
        directType === 'stimulus_case'
          ? opts
          : undefined,
      correctOptionIds:
        directType === 'single_choice' ||
        directType === 'multiple_choice' ||
        directType === 'true_false' ||
        directType === 'stimulus_case'
          ? selectedCorrectOpt
          : undefined,
      correctShortAnswers:
        directType === 'short_answer'
          ? [directShortAnswer.trim() || 'Jawaban']
          : undefined,
      correctNumericValue: directType === 'numeric' ? Number(directNumericVal) : undefined,
      numericTolerance: directType === 'numeric' ? Number(directNumericTol) : undefined,
      rubric:
        directType === 'essay'
          ? [
              {
                id: `rub-${Date.now()}`,
                criterion: 'Ketepatan Konsep & Kelengkapan Analisis Uraian',
                maxPoints: directPoints,
                description: 'Kesesuaian jawaban esai peserta terhadap kriteria penilaian.',
              },
            ]
          : undefined,
      points: Number(directPoints) || 10,
      explanation:
        directExplanation.trim() ||
        'Pembahasan soal dibuat langsung pada Formulir Pembuatan Kegiatan Asesmen.',
      category: category || 'Umum',
      topic: subject || addQuestionTag([], directTopicTags)[0] || 'Evaluasi Kompetensi',
      tags: getEffectiveQuestionTags({
        tags: addQuestionTag([], directTopicTags),
        topic: subject || 'Evaluasi Kompetensi',
        category: category || 'Umum',
      }),
      difficulty: directDifficulty,
      educationLevel,
      isDraft: directIsDraft,
      status: directIsDraft ? 'draft' : 'published',
      createdAt: now,
      updatedAt: now,
    });

    if (!directIsDraft) {
      setSelectedQuestionIds((prev) =>
        prev.includes(created.id) ? prev : [created.id, ...prev]
      );
    }
    setDirectPrompt('');
    setDirectExplanation('');
  };

  const handleApplyTemplatePack = (packId: string) => {
    const pack = QUESTION_TEMPLATE_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const res = importQuestionsBatch(
      pack.items.map((item) => ({
        ...item,
        educationLevel: educationLevel || pack.level,
      }))
    );
    if (res.importedIds.length > 0) {
      setSelectedQuestionIds((prev) => [
        ...res.importedIds.filter((newId) => !prev.includes(newId)),
        ...prev,
      ]);
      addToast(
        'success',
        'Template Soal Diterapkan',
        `${res.imported} butir soal dari "${pack.title}" berhasil ditambahkan ke kegiatan ini.`
      );
    }
  };

  const handleLoadSingleTypeTemplate = (tpl: (typeof SINGLE_TYPE_TEMPLATES)[number]) => {
    setDirectType(tpl.type);
    setDirectPrompt(tpl.prompt);
    setDirectOptA(tpl.options[0] || 'Pilihan A');
    setDirectOptB(tpl.options[1] || 'Pilihan B');
    setDirectOptC(tpl.options[2] || 'Pilihan C');
    setDirectOptD(tpl.options[3] || 'Pilihan D');
    setDirectCorrectIdx(tpl.correctIdx);
    setDirectShortAnswer(tpl.shortAnswer || 'N-Gain');
    setDirectNumericVal(tpl.numericVal || 35);
    setDirectPoints(tpl.points);
    setDirectExplanation(tpl.explanation);
    setQuestionSourceTab('create');
    addToast(
      'success',
      'Kerangka Template Dimuat',
      `Kerangka "${tpl.label}" siap Anda sesuaikan pada form Buat Soal Langsung.`
    );
  };

  const handleDownloadTemplateFile = (format: 'xlsx' | 'csv' | 'json') => {
    const rowsToExport =
      wizSpreadsheetRows.filter((r) => r.prompt.trim().length > 0).length > 0
        ? wizSpreadsheetRows.filter((r) => r.prompt.trim().length > 0)
        : DEFAULT_TEMPLATE_ROWS;

    if (format === 'xlsx') {
      downloadExcelQuestionTemplate(rowsToExport, 'template-impor-soal-asesmen-askia.xlsx');
      addToast(
        'success',
        'Template Excel (.xlsx) Diunduh',
        'Berkas Excel telah diunduh dengan 9 kolom terpisah (Kolom A s.d. Kolom I: prompt, questionType, optionA, optionB, optionC, optionD, correctAnswer, points, explanation).'
      );
    } else if (format === 'csv') {
      downloadCsvQuestionTemplate(rowsToExport, 'template-impor-soal-asesmen-askia.csv');
      addToast(
        'success',
        'Template CSV (Kolom Terpisah) Diunduh',
        'Berkas CSV telah dilengkapi instruksi pemisah kolom otomatis untuk Microsoft Excel.'
      );
    } else {
      const jsonContent = JSON.stringify(
        [
          {
            prompt: 'Manakah protokol standar yang digunakan untuk mengamankan komunikasi web (HTTPS)?',
            questionType: 'single_choice',
            options: [
              { id: 'opt-1', label: 'A', text: 'TLS / SSL (Transport Layer Security)' },
              { id: 'opt-2', label: 'B', text: 'FTP (File Transfer Protocol)' },
              { id: 'opt-3', label: 'C', text: 'Telnet' },
              { id: 'opt-4', label: 'D', text: 'SNMP' },
            ],
            correctOptionIds: ['opt-1'],
            points: 10,
            category: category || 'Teknologi Informasi',
            topic: subject || 'Keamanan Jaringan',
            difficulty: 'mudah',
            explanation: 'HTTPS menggunakan protokol TLS/SSL untuk mengenkripsi komunikasi antara klien dan server.',
          },
          {
            prompt: 'Hitunglah nilai rata-rata dari tiga nilai ujian berikut: 70, 80, dan 90!',
            questionType: 'numeric',
            correctNumericValue: 80,
            numericTolerance: 0,
            points: 10,
            category: category || 'Numerasi',
            topic: subject || 'Statistika Dasar',
            difficulty: 'mudah',
            explanation: '(70 + 80 + 90) / 3 = 240 / 3 = 80.',
          },
        ],
        null,
        2
      );
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-impor-soal-asesmen-askia.json';
      link.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Template JSON Diunduh', 'Berkas template-impor-soal-asesmen-askia.json berhasil diunduh.');
    }
  };

  const handleWizardFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          try {
            const parsedRows = parseExcelBufferToRows(reader.result);
            if (parsedRows.length > 0) {
              setWizSpreadsheetRows(parsedRows);
              setWizImportFormat('excel_table');
              setWizImportResult(null);
              addToast(
                'success',
                'Berkas Excel (.xlsx) Berhasil Dibaca',
                `${parsedRows.length} baris soal dengan kolom terpisah berhasil dimuat ke Tabel Kolom Terpisah.`
              );
            } else {
              addToast('error', 'Berkas Excel Kosong', 'Tidak ditemukan baris soal pada berkas Excel tersebut.');
            }
          } catch (err: any) {
            addToast('error', 'Gagal Membaca Excel', err?.message || 'Format berkas Excel tidak valid.');
          }
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
      return;
    }

    const isJson = lowerName.endsWith('.json');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setWizImportText(reader.result);
        setWizImportResult(null);
        if (isJson) {
          setWizImportFormat('json');
        } else {
          const parsedRows = parseDelimitedTextToRows(reader.result);
          if (parsedRows.length > 0) {
            setWizSpreadsheetRows(parsedRows);
            setWizImportFormat('excel_table');
          } else {
            setWizImportFormat('csv');
          }
        }
        addToast(
          'success',
          'Berkas Soal Dimuat',
          `Berkas "${file.name}" berhasil dibaca dan dipisahkan per kolom.`
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleWizardRunImport = () => {
    try {
      if (wizImportFormat === 'json') {
        const parsed = JSON.parse(wizImportText);
        if (!Array.isArray(parsed)) {
          setWizImportResult({
            imported: 0,
            duplicates: 0,
            errors: ['Format JSON harus berupa array daftar objek soal: [ { ... } ]'],
          });
          return;
        }
        const res = importQuestionsBatch(parsed);
        setWizImportResult(res);
        if (res.importedIds.length > 0) {
          setSelectedQuestionIds((prev) => [
            ...res.importedIds.filter((idItem) => !prev.includes(idItem)),
            ...prev,
          ]);
          addToast(
            'success',
            'Impor Soal JSON Berhasil',
            `${res.imported} soal berhasil diimpor dan langsung dipilih untuk kegiatan ini.`
          );
        }
      } else if (wizImportFormat === 'excel_table') {
        const items = convertSpreadsheetRowsToQuestions(wizSpreadsheetRows, {
          category: category || 'Umum',
          topic: subject || 'Evaluasi',
          difficulty,
          educationLevel,
        });
        const res = importQuestionsBatch(items);
        setWizImportResult(res);
        if (res.importedIds.length > 0) {
          setSelectedQuestionIds((prev) => [
            ...res.importedIds.filter((idItem) => !prev.includes(idItem)),
            ...prev,
          ]);
          addToast(
            'success',
            'Impor Soal Tabel Excel Berhasil',
            `${res.imported} soal dari tabel kolom terpisah berhasil diimpor dan dipilih untuk kegiatan ini.`
          );
        }
      } else {
        const parsedRows = parseDelimitedTextToRows(wizImportText);
        const items = convertSpreadsheetRowsToQuestions(parsedRows, {
          category: category || 'Umum',
          topic: subject || 'Evaluasi',
          difficulty,
          educationLevel,
        });
        const res = importQuestionsBatch(items);
        setWizImportResult(res);
        if (res.importedIds.length > 0) {
          setSelectedQuestionIds((prev) => [
            ...res.importedIds.filter((idItem) => !prev.includes(idItem)),
            ...prev,
          ]);
          addToast(
            'success',
            'Impor Soal CSV Berhasil',
            `${res.imported} soal berhasil diimpor dan otomatis dipilih untuk kegiatan ini.`
          );
        }
      }
    } catch (err: any) {
      setWizImportResult({
        imported: 0,
        duplicates: 0,
        errors: [`Kesalahan format data impor: ${err?.message || 'Format tidak valid'}`],
      });
    }
  };

  const validateConfiguration = (): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Judul kegiatan wajib diisi (Langkah 1).');
    if (!subject.trim()) errs.push('Mata pelajaran atau bidang kompetensi wajib diisi (Langkah 1).');
    if (selectedQuestionIds.length === 0)
      errs.push('Pilih minimal 1 soal dari Bank Soal (Langkah 3).');
    if (durationMinutes < 1) errs.push('Durasi ujian minimal 1 menit (Langkah 4).');
    if (!accessCode.trim()) errs.push('Kode akses ujian wajib diisi (Langkah 4).');
    setValidationMessages(errs);
    return errs;
  };

  const buildAssessmentPayload = (statusOverride?: AssessmentStatus): Assessment => {
    const now = new Date().toISOString();
    return {
      id: existing?.id || `asm-${Date.now()}`,
      ownerId: currentUser.uid,
      authorName: currentUser.fullName,
      organizationId: currentUser.organizationId,
      organizationName: currentUser.organizationName,
      title: title.trim() || 'Kegiatan Asesmen Tanpa Judul',
      description: description.trim() || 'Kegiatan evaluasi kompetensi peserta.',
      objective: objective.trim() || 'Mengukur capaian pembelajaran.',
      organizer: organizer.trim(),
      educationLevel,
      subject: subject.trim() || 'Umum',
      category,
      language,
      difficulty,
      assessmentType,
      pairedAssessmentId: pairedAssessmentId || undefined,
      status: statusOverride || existing?.status || 'draft',
      version: existing?.version || 1,
      questionIds: selectedQuestionIds,
      shuffleQuestions,
      shuffleOptions,
      requireAllQuestions,
      assignedGroupIds,
      assignedParticipantIds,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMinutes,
      maxAttempts,
      accessCode: accessCode.trim().toUpperCase(),
      examToken: examToken.trim() || undefined,
      latePolicy,
      autoPublishResult,
      showExplanation,
      showCorrectAnswer,
      passingScore,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  };

  const handleSaveDraft = () => {
    const payload = buildAssessmentPayload('draft');
    saveAssessment(payload, false);
    navigate('/activities');
  };

  const handlePublish = () => {
    const errs = validateConfiguration();
    if (errs.length > 0) {
      addToast('error', 'Persyaratan Wajib Belum Terpenuhi', errs[0]);
      return;
    }
    const payload = buildAssessmentPayload('ready');
    const saved = saveAssessment(payload, true);
    navigate(`/activities/${saved.id}`);
  };

  const totalSelectedPoints = questions
    .filter((q) => selectedQuestionIds.includes(q.id))
    .reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-5">
        <div>
          <Link
            to="/activities"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Kegiatan</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111C2D]">
            {existing ? `Edit Kegiatan: ${existing.title}` : 'Formulir Pembuatan Kegiatan Asesmen'}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSaveDraft}
          className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg"
        >
          Simpan Draf Cepat
        </button>
      </div>

      {/* Step Progress Bar + Quick Question Tools Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {WIZARD_STEPS.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`p-2.5 rounded-lg text-left border transition-colors ${
                  isActive
                    ? 'border-[#4A7C59] bg-[#EEF4F0]'
                    : isDone
                    ? 'border-[#E2E8F0] bg-[#F8F9F7]'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px] font-mono-tabular font-semibold text-[#4A7C59]">
                  Langkah 0{s.num}
                </div>
                <div className="text-xs font-bold text-[#111C2D] truncate mt-0.5">{s.title}</div>
              </button>
            );
          })}
        </div>

        {/* Pintasan Penyusunan Soal (Tersedia di Semua Langkah Formulir) */}
        <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="font-semibold text-[#111C2D]">Penyusunan Soal Kegiatan:</span>
            <span>
              Terpilih <strong className="font-mono-tabular text-[#4A7C59]">{selectedQuestionIds.length} Soal</strong> ({totalSelectedPoints} Poin)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStep(3);
                setQuestionSourceTab('create');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                step === 3 && questionSourceTab === 'create'
                  ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                  : 'bg-[#F8F9F7] text-[#111C2D] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Soal Langsung</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(3);
                setQuestionSourceTab('template');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                step === 3 && questionSourceTab === 'template'
                  ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                  : 'bg-[#F8F9F7] text-[#111C2D] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4A7C59]" />
              <span>Template Soal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(3);
                setQuestionSourceTab('import');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                step === 3 && questionSourceTab === 'import'
                  ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                  : 'bg-[#F8F9F7] text-[#111C2D] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-[#4A7C59]" />
              <span>Impor Soal (CSV / JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(3);
                setQuestionSourceTab('bank');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                step === 3 && questionSourceTab === 'bank'
                  ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                  : 'bg-[#F8F9F7] text-[#111C2D] border-[#E2E8F0] hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Pilih dari Bank Soal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Wizard Step Content */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 lg:p-8 space-y-6">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#111C2D]">Langkah 1 — Informasi Kegiatan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="wiz-title" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Judul Kegiatan Asesmen *
                </label>
                <input
                  id="wiz-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pretest Kompetensi Literasi Sains Semester Ganjil"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="wiz-desc" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Deskripsi Kegiatan
                </label>
                <textarea
                  id="wiz-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Uraikan cakupan materi dan instruksi umum bagi peserta..."
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                />
              </div>

              <div>
                <label htmlFor="wiz-objective" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Tujuan Asesmen
                </label>
                <input
                  id="wiz-objective"
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Mengukur kemampuan awal sebelum pelatihan..."
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                />
              </div>

              <div>
                <label htmlFor="wiz-organizer" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Penyelenggara / Unit Kerja
                </label>
                <input
                  id="wiz-organizer"
                  type="text"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                />
              </div>

              <div>
                <label htmlFor="wiz-level" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Jenjang Pendidikan / Kelompok Sasaran
                </label>
                <select
                  id="wiz-level"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                >
                  <option value="PAUD/TK">PAUD / TK</option>
                  <option value="SD/MI">SD / MI</option>
                  <option value="SMP/MTs">SMP / MTs</option>
                  <option value="SMA/SMK/MA">SMA / SMK / MA</option>
                  <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                  <option value="Kursus & Pelatihan">Lembaga Kursus &amp; Pelatihan</option>
                  <option value="Instansi Pemerintah">Instansi Pemerintah</option>
                  <option value="Perusahaan & Korporasi">Perusahaan &amp; Korporasi</option>
                  <option value="Organisasi & Umum">Organisasi, Komunitas &amp; Umum</option>
                </select>
              </div>

              <div>
                <label htmlFor="wiz-subject" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Mata Pelajaran / Bidang Kompetensi *
                </label>
                <input
                  id="wiz-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Biologi Molekuler / Tata Kelola SPBE"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                />
              </div>

              <div>
                <label htmlFor="wiz-cat" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kategori Asesmen
                </label>
                <input
                  id="wiz-cat"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                />
              </div>

              <div>
                <label htmlFor="wiz-diff" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Tingkat Kesulitan Dominan
                </label>
                <select
                  id="wiz-diff"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                >
                  <option value="mudah">Mudah (Dasar)</option>
                  <option value="sedang">Sedang (Menengah)</option>
                  <option value="sulit">Sulit (Lanjut / HOTS)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#111C2D]">Langkah 2 — Jenis Asesmen &amp; Pasangan Evaluasi</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  {
                    key: 'pretest',
                    title: 'Pretest (Tes Awal)',
                    desc: 'Mencatat kondisi awal peserta sebelum pembelajaran atau pelatihan dimulai.',
                  },
                  {
                    key: 'posttest',
                    title: 'Posttest (Tes Akhir)',
                    desc: 'Mengukur hasil akhir pascapembelajaran dan dapat ditautkan ke Pretest.',
                  },
                  {
                    key: 'paired',
                    title: 'Paket Pretest & Posttest Berpasangan',
                    desc: 'Menghubungkan Pretest dan Posttest dalam satu program untuk analisis N-Gain.',
                  },
                  {
                    key: 'single',
                    title: 'Ujian Tunggal / Kompetensi',
                    desc: 'Ujian sertifikasi, seleksi, atau evaluasi komprehensif satu tahap.',
                  },
                  {
                    key: 'quiz',
                    title: 'Kuis Formatif',
                    desc: 'Kuis singkat evaluasi pemahaman materi harian atau sesi.',
                  },
                  {
                    key: 'periodic',
                    title: 'Evaluasi Berkala',
                    desc: 'Penilaian tengah semester, akhir semester, atau evaluasi triwulan.',
                  },
                ] as { key: AssessmentType; title: string; desc: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAssessmentType(item.key)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    assessmentType === item.key
                      ? 'border-[#4A7C59] bg-[#EEF4F0]'
                      : 'border-[#E2E8F0] bg-[#F8F9F7] hover:bg-white'
                  }`}
                >
                  <div className="text-sm font-bold text-[#111C2D]">{item.title}</div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>

            {(assessmentType === 'pretest' ||
              assessmentType === 'posttest' ||
              assessmentType === 'paired') && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <label htmlFor="wiz-pair" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kaitkan dengan Kegiatan Pasangan (Pretest / Posttest)
                </label>
                <select
                  id="wiz-pair"
                  value={pairedAssessmentId}
                  onChange={(e) => setPairedAssessmentId(e.target.value)}
                  className="w-full max-w-lg px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                >
                  <option value="">-- Tidak dikaitkan / Buat pasangan nanti --</option>
                  {assessments
                    .filter((a) => a.id !== existing?.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({TYPE_LABELS[a.assessmentType]})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Pengaitan ini memungkinkan sistem menghitung selisih nilai dan N-Gain berdasarkan ID peserta yang terverifikasi.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#111C2D]">
                  Langkah 3 — Pengaturan, Pembuatan, Template &amp; Impor Soal
                </h2>
                <p className="text-xs text-slate-500">
                  Terpilih: <strong className="font-mono-tabular text-[#111C2D]">{selectedQuestionIds.length}</strong> soal · Total Bobot Skor:{' '}
                  <strong className="font-mono-tabular text-[#4A7C59]">{totalSelectedPoints} Poin</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded border-slate-300 text-[#4A7C59]"
                  />
                  <span>Acak Urutan Soal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded border-slate-300 text-[#4A7C59]"
                  />
                  <span>Acak Opsi Jawaban</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireAllQuestions}
                    onChange={(e) => setRequireAllQuestions(e.target.checked)}
                    className="rounded border-slate-300 text-[#4A7C59]"
                  />
                  <span>Wajib Dijawab Semua</span>
                </label>
              </div>
            </div>

            {/* Mode Switcher Tabs inside Step 3 */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#F8F9F7] border border-[#E2E8F0] rounded-xl">
              <button
                type="button"
                onClick={() => setQuestionSourceTab('create')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  questionSourceTab === 'create'
                    ? 'bg-[#4A7C59] text-white'
                    : 'text-slate-600 hover:text-[#111C2D] hover:bg-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>1. Buat Soal Langsung</span>
              </button>
              <button
                type="button"
                onClick={() => setQuestionSourceTab('template')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  questionSourceTab === 'template'
                    ? 'bg-[#4A7C59] text-white'
                    : 'text-slate-600 hover:text-[#111C2D] hover:bg-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. Template Soal Siap Pakai</span>
              </button>
              <button
                type="button"
                onClick={() => setQuestionSourceTab('import')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  questionSourceTab === 'import'
                    ? 'bg-[#4A7C59] text-white'
                    : 'text-slate-600 hover:text-[#111C2D] hover:bg-white'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>3. Impor Soal (CSV / JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setQuestionSourceTab('bank')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  questionSourceTab === 'bank'
                    ? 'bg-[#4A7C59] text-white'
                    : 'text-slate-600 hover:text-[#111C2D] hover:bg-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>4. Pilih dari Bank Soal ({questions.length})</span>
              </button>
            </div>

            {/* PANEL 1: BUAT SOAL LANGSUNG (CEPAT + LENGKAP MULTI-TIPE) */}
            {questionSourceTab === 'create' && (
              <div className="space-y-4">
                {/* Existing Quick Add New Question Inline (Preserved) */}
                <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] space-y-3">
                  <div className="text-xs font-semibold text-[#111C2D]">
                    Buat Soal Baru Cepat 1-Baris (Langsung Masuk ke Bank Soal &amp; Kegiatan Ini)
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={quickPrompt}
                      onChange={(e) => setQuickPrompt(e.target.value)}
                      placeholder="Tulis pertanyaan soal baru di sini..."
                      aria-label="Tulis pertanyaan soal baru"
                      className="flex-1 px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={quickPoints}
                      onChange={(e) => setQuickPoints(Number(e.target.value))}
                      aria-label="Bobot skor soal"
                      className="w-24 px-3 py-2 text-xs font-mono-tabular bg-white border border-[#E2E8F0] rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddQuestion}
                      className="px-4 py-2 bg-[#111C2D] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 whitespace-nowrap"
                    >
                      + Tambah &amp; Pilih Soal
                    </button>
                  </div>
                </div>

                {/* Full Multi-Type Direct Question Builder */}
                <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#111C2D]">
                        Editor Pembuatan Soal Langsung Multi-Tipe
                      </h3>
                      <p className="text-xs text-slate-500">
                        Susun soal lengkap beserta opsi jawaban, kunci penilaian, bobot skor, dan pembahasan tanpa keluar dari formulir kegiatan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuestionSourceTab('template')}
                      className="px-3 py-1.5 text-xs font-semibold text-[#4A7C59] bg-[#EEF4F0] rounded-lg hover:bg-[#E2ECE5]"
                    >
                      Muat dari Template Soal →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="dir-q-type" className="block text-xs font-semibold text-[#111C2D] mb-1">
                        Jenis Butir Soal
                      </label>
                      <select
                        id="dir-q-type"
                        value={directType}
                        onChange={(e) => setDirectType(e.target.value as QuestionType)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                      >
                        <option value="single_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                        <option value="multiple_choice">Pilihan Ganda Kompleks</option>
                        <option value="true_false">Benar atau Salah</option>
                        <option value="short_answer">Isian Singkat</option>
                        <option value="numeric">Jawaban Angka (Numerik)</option>
                        <option value="essay">Esai / Uraian Manual</option>
                        <option value="stimulus_case">Studi Kasus / Stimulus</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="dir-q-points" className="block text-xs font-semibold text-[#111C2D] mb-1">
                        Bobot Skor (Poin)
                      </label>
                      <input
                        id="dir-q-points"
                        type="number"
                        min={1}
                        max={100}
                        value={directPoints}
                        onChange={(e) => setDirectPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                      />
                    </div>

                    <div>
                      <label htmlFor="dir-q-diff" className="block text-xs font-semibold text-[#111C2D] mb-1">
                        Tag Tingkat Kesulitan
                      </label>
                      <select
                        id="dir-q-diff"
                        value={directDifficulty}
                        onChange={(e) => setDirectDifficulty(e.target.value as DifficultyLevel)}
                        className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                      >
                        <option value="mudah">Mudah (C1–C2)</option>
                        <option value="sedang">Sedang (C3–C4)</option>
                        <option value="sulit">Sulit / HOTS (C5–C6)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dir-q-tags" className="block text-xs font-semibold text-[#111C2D] mb-1">
                      Tag Topik &amp; Kategori Soal (Pisahkan dengan koma untuk difilter di Bank Soal)
                    </label>
                    <input
                      id="dir-q-tags"
                      type="text"
                      value={directTopicTags}
                      onChange={(e) => setDirectTopicTags(e.target.value)}
                      placeholder="Contoh: Metabolisme Sel, Biologi Molekuler, HOTS"
                      className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>

                  <div>
                    <label htmlFor="dir-q-prompt" className="block text-xs font-semibold text-[#111C2D] mb-1">
                      Pokok Pertanyaan / Instruksi Soal *
                    </label>
                    <textarea
                      id="dir-q-prompt"
                      rows={3}
                      value={directPrompt}
                      onChange={(e) => setDirectPrompt(e.target.value)}
                      placeholder="Tuliskan pertanyaan lengkap di sini..."
                      className="w-full px-3.5 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>

                  {/* Dynamic Answer Key Fields based on Question Type */}
                  {(directType === 'single_choice' ||
                    directType === 'multiple_choice' ||
                    directType === 'stimulus_case') && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[#111C2D]">
                        Opsi Pilihan Jawaban &amp; Penentuan Kunci Jawaban Benar:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          { label: 'A', val: directOptA, setVal: setDirectOptA, idx: 0 },
                          { label: 'B', val: directOptB, setVal: setDirectOptB, idx: 1 },
                          { label: 'C', val: directOptC, setVal: setDirectOptC, idx: 2 },
                          { label: 'D', val: directOptD, setVal: setDirectOptD, idx: 3 },
                        ].map((opt) => (
                          <div
                            key={opt.label}
                            className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                              directCorrectIdx === opt.idx
                                ? 'border-[#4A7C59] bg-[#EEF4F0]/60'
                                : 'border-[#E2E8F0] bg-[#F8F9F7]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="direct-correct-opt"
                              checked={directCorrectIdx === opt.idx}
                              onChange={() => setDirectCorrectIdx(opt.idx)}
                              aria-label={`Jadikan opsi ${opt.label} sebagai kunci jawaban`}
                              className="text-[#4A7C59]"
                            />
                            <span className="text-xs font-bold text-[#111C2D] w-4">{opt.label}.</span>
                            <input
                              type="text"
                              value={opt.val}
                              onChange={(e) => opt.setVal(e.target.value)}
                              aria-label={`Teks opsi ${opt.label}`}
                              className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#E2E8F0] rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {directType === 'true_false' && (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-xs">
                      <span className="font-semibold text-[#111C2D]">Kunci Jawaban Benar/Salah:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={directCorrectIdx === 0}
                          onChange={() => setDirectCorrectIdx(0)}
                        />
                        <span className="font-semibold text-[#16A34A]">Pernyataan Benar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={directCorrectIdx === 1}
                          onChange={() => setDirectCorrectIdx(1)}
                        />
                        <span className="font-semibold text-[#DC2626]">Pernyataan Salah</span>
                      </label>
                    </div>
                  )}

                  {directType === 'short_answer' && (
                    <div>
                      <label htmlFor="dir-short-ans" className="block text-xs font-semibold text-[#111C2D] mb-1">
                        Kunci Jawaban Isian Singkat
                      </label>
                      <input
                        id="dir-short-ans"
                        type="text"
                        value={directShortAnswer}
                        onChange={(e) => setDirectShortAnswer(e.target.value)}
                        placeholder="Contoh: Osmosis"
                        className="w-full max-w-md px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                      />
                    </div>
                  )}

                  {directType === 'numeric' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                      <div>
                        <label htmlFor="dir-num-val" className="block text-xs font-semibold text-[#111C2D] mb-1">
                          Kunci Angka Tepat
                        </label>
                        <input
                          id="dir-num-val"
                          type="number"
                          step="any"
                          value={directNumericVal}
                          onChange={(e) => setDirectNumericVal(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                        />
                      </div>
                      <div>
                        <label htmlFor="dir-num-tol" className="block text-xs font-semibold text-[#111C2D] mb-1">
                          Toleransi Selisih (±)
                        </label>
                        <input
                          id="dir-num-tol"
                          type="number"
                          step="any"
                          value={directNumericTol}
                          onChange={(e) => setDirectNumericTol(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-1">
                    <div className="flex-1">
                      <label htmlFor="dir-q-exp" className="block text-xs font-semibold text-[#111C2D] mb-1">
                        Pembahasan / Rasional Jawaban (Opsional)
                      </label>
                      <input
                        id="dir-q-exp"
                        type="text"
                        value={directExplanation}
                        onChange={(e) => setDirectExplanation(e.target.value)}
                        placeholder="Penjelasan kunci jawaban untuk umpan balik peserta..."
                        className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                      />
                    </div>

                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8F9F7] cursor-pointer text-xs font-semibold text-[#111C2D] whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={directIsDraft}
                        onChange={(e) => setDirectIsDraft(e.target.checked)}
                        className="rounded border-slate-300 text-[#D97706]"
                      />
                      <span>Save as Draft (Simpan Draf)</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleDirectCreateQuestion}
                      className={`px-4 py-2 text-white text-xs font-semibold rounded-lg whitespace-nowrap flex items-center justify-center gap-1.5 ${
                        directIsDraft
                          ? 'bg-[#D97706] hover:bg-amber-700'
                          : 'bg-[#4A7C59] hover:bg-[#3D6849]'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {directIsDraft
                          ? 'Simpan sebagai Draf (Belum Dipublikasikan)'
                          : 'Simpan Soal & Masukkan ke Kegiatan Ini'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL 2: TEMPLATE SOAL SIAP PAKAI & UNDUH FORMAT TEMPLATE EXCEL KOLOM TERPISAH */}
            {questionSourceTab === 'template' && (
              <div className="space-y-5 p-5 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#111C2D]">
                      Pusat Template Soal Siap Pakai &amp; Template Excel (.xlsx) Kolom Terpisah
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Unduh berkas Microsoft Excel (<strong>.xlsx</strong>) dengan 9 kolom yang sudah terpisah otomatis (Kolom A s.d. Kolom I), atau gunakan paket template soal siap pakai.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplateFile('xlsx')}
                      className="px-3.5 py-2 bg-[#16A34A] hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Unduh Template Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplateFile('csv')}
                      className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Unduh CSV (Pemisah Kolom)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplateFile('json')}
                      className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
                      <span>Unduh Template JSON</span>
                    </button>
                  </div>
                </div>

                {/* Struktur 9 Kolom Terpisah Template Excel */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#111C2D]">
                        Struktur Tabel Template Excel (.xlsx) — Masing-Masing Kolom Terpisah (Kolom A s.d. Kolom I)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Setiap atribut soal berada pada kolom tersendiri di Excel (bukan digabung dengan koma dalam satu sel). Anda juga dapat mengedit isi sel di bawah ini sebelum mengunduh Excel atau mengimpornya langsung.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSpreadsheetRow}
                        className="px-2.5 py-1.5 bg-[#F8F9F7] border border-[#E2E8F0] hover:bg-slate-100 text-[#111C2D] text-xs font-semibold rounded-lg"
                      >
                        + Tambah Baris Template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWizImportFormat('excel_table');
                          handleWizardRunImport();
                        }}
                        className="px-3 py-1.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg"
                      >
                        Masukkan Tabel Ini ke Kegiatan
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#EEF4F0] border-b border-[#E2E8F0] text-[#111C2D]">
                          <th className="py-2 px-2.5 font-mono-tabular font-bold border-r border-[#E2E8F0] w-10 text-center">
                            #
                          </th>
                          {SPREADSHEET_COLUMNS.map((col, cIdx) => (
                            <th
                              key={col.key}
                              className="py-2 px-2.5 border-r border-[#E2E8F0] min-w-[130px]"
                            >
                              <div className="text-[10px] font-mono-tabular font-semibold text-[#4A7C59]">
                                Kolom {String.fromCharCode(65 + cIdx)}
                              </div>
                              <div className="font-mono-tabular font-bold text-[#111C2D]">
                                {col.header}
                              </div>
                              <div className="text-[10px] font-normal text-slate-500">
                                {col.label}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {wizSpreadsheetRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/70">
                            <td className="py-1.5 px-2 font-mono-tabular text-center text-slate-500 border-r border-[#E2E8F0]">
                              {rIdx + 1}
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[240px]">
                              <input
                                type="text"
                                value={row.prompt}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'prompt', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} prompt`}
                                className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[140px]">
                              <select
                                value={row.questionType}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'questionType', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} questionType`}
                                className="w-full px-2 py-1 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              >
                                <option value="single_choice">single_choice</option>
                                <option value="multiple_choice">multiple_choice</option>
                                <option value="true_false">true_false</option>
                                <option value="short_answer">short_answer</option>
                                <option value="numeric">numeric</option>
                                <option value="essay">essay</option>
                              </select>
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                              <input
                                type="text"
                                value={row.optionA}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'optionA', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} optionA`}
                                className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                              <input
                                type="text"
                                value={row.optionB}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'optionB', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} optionB`}
                                className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                              <input
                                type="text"
                                value={row.optionC}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'optionC', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} optionC`}
                                className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                              <input
                                type="text"
                                value={row.optionD}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'optionD', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} optionD`}
                                className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[100px]">
                              <input
                                type="text"
                                value={row.correctAnswer}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'correctAnswer', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} correctAnswer`}
                                className="w-full px-2 py-1 text-xs font-mono-tabular font-bold text-[#4A7C59] bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 border-r border-[#E2E8F0] min-w-[80px]">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={row.points}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'points', Number(e.target.value))
                                }
                                aria-label={`Baris ${rIdx + 1} points`}
                                className="w-full px-2 py-1 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                            <td className="p-1.5 min-w-[200px]">
                              <input
                                type="text"
                                value={row.explanation}
                                onChange={(e) =>
                                  handleUpdateSpreadsheetCell(rIdx, 'explanation', e.target.value)
                                }
                                aria-label={`Baris ${rIdx + 1} explanation`}
                                className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Paket Template Soal Instan */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-[#111C2D]">
                    A. Paket Template Soal Siap Pakai (Langsung Masuk ke Kegiatan Ini)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUESTION_TEMPLATE_PACKS.map((pack) => (
                      <div
                        key={pack.id}
                        className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold text-[#4A7C59]">
                            {pack.badge} · {pack.items.length} Soal
                          </div>
                          <h4 className="text-xs font-bold text-[#111C2D] leading-snug">
                            {pack.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {pack.description}
                          </p>
                          <div className="pt-1 space-y-1">
                            {pack.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-500 truncate bg-[#F8F9F7] px-2 py-1 rounded border border-[#E2E8F0]"
                              >
                                {idx + 1}. ({it.questionType}) {it.prompt}
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyTemplatePack(pack.id)}
                          className="w-full py-2 px-3 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Gunakan Paket Template ({pack.items.length} Soal)</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kerangka Template Per Jenis Soal */}
                <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                  <div className="text-xs font-bold text-[#111C2D]">
                    B. Kerangka Template Satuan Berdasarkan Tipe Soal (Isi Otomatis ke Editor Soal)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SINGLE_TYPE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => handleLoadSingleTypeTemplate(tpl)}
                        className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#4A7C59] text-xs font-semibold text-[#111C2D] rounded-lg flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#4A7C59]" />
                        <span>{tpl.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PANEL 3: IMPOR SOAL (FILE EXCEL .XLSX / CSV KOLOM TERPISAH / JSON) */}
            {questionSourceTab === 'import' && (
              <div className="space-y-4 p-5 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#111C2D]">
                      Impor Soal ke Kegiatan Asesmen (Excel .xlsx Kolom Terpisah, CSV &amp; JSON)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Unggah berkas Excel (<strong>.xlsx</strong>), CSV, atau JSON dari komputer Anda, atau isi langsung pada tabel 9 kolom terpisah di bawah ini.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      ref={wizardFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.json,.txt"
                      onChange={handleWizardFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => wizardFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-[#111C2D] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Pilih Berkas Excel (.xlsx) / CSV / JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplateFile('xlsx')}
                      className="px-3.5 py-2 bg-[#16A34A] hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Unduh Template Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplateFile('csv')}
                      className="px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
                      <span>Unduh CSV</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWizImportFormat('excel_table')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                        wizImportFormat === 'excel_table'
                          ? 'bg-[#4A7C59] text-white'
                          : 'bg-white border border-[#E2E8F0] text-slate-600'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Tabel Kolom Terpisah (Excel .xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizImportFormat('csv')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                        wizImportFormat === 'csv'
                          ? 'bg-[#4A7C59] text-white'
                          : 'bg-white border border-[#E2E8F0] text-slate-600'
                      }`}
                    >
                      Teks CSV (Pemisah ; atau ,)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWizImportFormat('json');
                        setWizImportText(
                          JSON.stringify(
                            [
                              {
                                prompt:
                                  'Manakah komponen utama dalam penyusunan indikator keberhasilan pelatihan berbasis kompetensi?',
                                questionType: 'single_choice',
                                options: [
                                  { id: 'imp-j1-a', label: 'A', text: 'Indikator terukur, spesifik, dan relevan dengan capaian pembelajaran' },
                                  { id: 'imp-j1-b', label: 'B', text: 'Indikator bersifat subjektif tanpa standar penilaian' },
                                  { id: 'imp-j1-c', label: 'C', text: 'Tidak memerlukan evaluasi awal maupun akhir' },
                                  { id: 'imp-j1-d', label: 'D', text: 'Hanya menilai kehadiran tanpa mengukur pemahaman' },
                                ],
                                correctOptionIds: ['imp-j1-a'],
                                points: 10,
                                category: category || 'Evaluasi Pelatihan',
                                difficulty: 'mudah',
                                explanation: 'Indikator kompetensi harus spesifik, terukur, dan selaras dengan tujuan pembelajaran.',
                              },
                            ],
                            null,
                            2
                          )
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                        wizImportFormat === 'json'
                          ? 'bg-[#4A7C59] text-white'
                          : 'bg-white border border-[#E2E8F0] text-slate-600'
                      }`}
                    >
                      Format JSON
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span>9 Kolom Terpisah:</span>
                    {SPREADSHEET_COLUMNS.map((c) => (
                      <span
                        key={c.key}
                        className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded font-mono-tabular font-semibold text-[#111C2D]"
                      >
                        {c.header}
                      </span>
                    ))}
                  </div>
                </div>

                {wizImportFormat === 'excel_table' ? (
                  <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <div className="p-3 bg-[#EEF4F0]/60 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#111C2D]">
                        Pratinjau &amp; Editor Tabel Soal (Masing-Masing Kolom Terpisah: Kolom A s.d. Kolom I)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddSpreadsheetRow}
                          className="px-2.5 py-1 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#111C2D] rounded-md"
                        >
                          + Tambah Baris Soal
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWizSpreadsheetRows(DEFAULT_TEMPLATE_ROWS.map((r) => ({ ...r })))
                          }
                          className="px-2.5 py-1 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-xs text-slate-600 rounded-md"
                        >
                          Reset Contoh
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8F9F7] border-b border-[#E2E8F0] text-[#111C2D]">
                            <th className="py-2 px-2.5 font-mono-tabular font-bold border-r border-[#E2E8F0] w-10 text-center">
                              No
                            </th>
                            {SPREADSHEET_COLUMNS.map((col, cIdx) => (
                              <th
                                key={col.key}
                                className="py-2 px-2.5 border-r border-[#E2E8F0] min-w-[130px]"
                              >
                                <div className="text-[10px] font-mono-tabular font-semibold text-[#4A7C59]">
                                  Kolom {String.fromCharCode(65 + cIdx)}
                                </div>
                                <div className="font-mono-tabular font-bold text-[#111C2D]">
                                  {col.header}
                                </div>
                                <div className="text-[10px] font-normal text-slate-500">
                                  {col.label}
                                </div>
                              </th>
                            ))}
                            <th className="py-2 px-2.5 text-center w-14">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {wizSpreadsheetRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/70">
                              <td className="py-1.5 px-2 font-mono-tabular text-center text-slate-500 border-r border-[#E2E8F0]">
                                {rIdx + 1}
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[240px]">
                                <input
                                  type="text"
                                  value={row.prompt}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'prompt', e.target.value)
                                  }
                                  placeholder="Tulis pokok pertanyaan..."
                                  aria-label={`Impor baris ${rIdx + 1} prompt`}
                                  className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[140px]">
                                <select
                                  value={row.questionType}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'questionType', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} questionType`}
                                  className="w-full px-2 py-1 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                >
                                  <option value="single_choice">single_choice</option>
                                  <option value="multiple_choice">multiple_choice</option>
                                  <option value="true_false">true_false</option>
                                  <option value="short_answer">short_answer</option>
                                  <option value="numeric">numeric</option>
                                  <option value="essay">essay</option>
                                </select>
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                                <input
                                  type="text"
                                  value={row.optionA}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'optionA', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} optionA`}
                                  className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                                <input
                                  type="text"
                                  value={row.optionB}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'optionB', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} optionB`}
                                  className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                                <input
                                  type="text"
                                  value={row.optionC}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'optionC', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} optionC`}
                                  className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[130px]">
                                <input
                                  type="text"
                                  value={row.optionD}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'optionD', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} optionD`}
                                  className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[100px]">
                                <input
                                  type="text"
                                  value={row.correctAnswer}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'correctAnswer', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} correctAnswer`}
                                  className="w-full px-2 py-1 text-xs font-mono-tabular font-bold text-[#4A7C59] bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[80px]">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={row.points}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(
                                      rIdx,
                                      'points',
                                      Number(e.target.value)
                                    )
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} points`}
                                  className="w-full px-2 py-1 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-[#E2E8F0] min-w-[200px]">
                                <input
                                  type="text"
                                  value={row.explanation}
                                  onChange={(e) =>
                                    handleUpdateSpreadsheetCell(rIdx, 'explanation', e.target.value)
                                  }
                                  aria-label={`Impor baris ${rIdx + 1} explanation`}
                                  className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpreadsheetRow(rIdx)}
                                  aria-label={`Hapus baris soal ${rIdx + 1}`}
                                  className="p-1 text-slate-400 hover:text-[#DC2626] rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    value={wizImportText}
                    onChange={(e) => setWizImportText(e.target.value)}
                    aria-label="Data impor soal pada formulir kegiatan"
                    className="w-full p-3 text-xs font-mono-tabular bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
                  />
                )}

                {wizImportResult && (
                  <div className="p-3.5 rounded-lg bg-white border border-[#E2E8F0] text-xs space-y-1">
                    <div className="font-semibold text-[#16A34A]">
                      Hasil Impor: {wizImportResult.imported} butir soal berhasil diimpor &amp; ditambahkan ke kegiatan ini ·{' '}
                      {wizImportResult.duplicates} indikasi duplikasi terdeteksi.
                    </div>
                    {wizImportResult.errors.map((err, i) => (
                      <div key={i} className="text-[#DC2626]">
                        • {err}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleWizardRunImport}
                    className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Proses &amp; Impor Soal ke Kegiatan Ini</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bank Soal Selection List (Always Visible in Step 3) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#111C2D]">
                  Daftar Pilihan Bank Soal Aktif (Centang untuk Memasukkan ke Kegiatan Ini)
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Menampilkan{' '}
                    {questions.filter((q) => !q.isDraft && q.status !== 'draft').length} butir soal aktif
                  </span>
                  {questions.some((q) => q.isDraft || q.status === 'draft') && (
                    <Link
                      to="/question-bank?status=draft"
                      className="font-semibold text-[#D97706] hover:underline"
                    >
                      ({questions.filter((q) => q.isDraft || q.status === 'draft').length} Draf Soal Disembunyikan →)
                    </Link>
                  )}
                </div>
              </div>
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl max-h-96 overflow-y-auto bg-white">
                {questions
                  .filter((q) => !q.isDraft && q.status !== 'draft')
                  .map((q) => {
                  const checked = selectedQuestionIds.includes(q.id);
                  return (
                    <label
                      key={q.id}
                      className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                        checked ? 'bg-[#EEF4F0]/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleQuestionId(q.id)}
                        className="mt-1 rounded border-slate-300 text-[#4A7C59]"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#4A7C59]">{q.questionType}</span>
                          <span>·</span>
                          <span>{q.category}</span>
                          <span>·</span>
                          <span className="font-mono-tabular font-semibold text-[#111C2D]">
                            {q.points} Poin
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[#111C2D]">{q.prompt}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#111C2D]">Langkah 4 — Peserta, Jadwal &amp; Aturan Ujian</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="wiz-start" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Waktu Mulai
                </label>
                <input
                  id="wiz-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wiz-end" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Waktu Berakhir
                </label>
                <input
                  id="wiz-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wiz-dur" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Durasi Pengerjaan (Menit) *
                </label>
                <input
                  id="wiz-dur"
                  type="number"
                  min={1}
                  max={600}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wiz-code" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kode Akses Ujian *
                </label>
                <input
                  id="wiz-code"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wiz-token" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Token Keamanan Ujian (Opsional)
                </label>
                <input
                  id="wiz-token"
                  type="text"
                  value={examToken}
                  onChange={(e) => setExamToken(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="wiz-attempts" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Batas Maksimum Percobaan
                </label>
                <input
                  id="wiz-attempts"
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold text-[#111C2D] mb-2">
                  Pilih Kelompok atau Kelas Peserta
                </div>
                <div className="space-y-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedGroupIds.includes(g.id)}
                        onChange={() =>
                          setAssignedGroupIds((prev) =>
                            prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                          )
                        }
                        className="rounded border-slate-300 text-[#4A7C59]"
                      />
                      <span>
                        {g.name} ({g.memberIds.length} peserta)
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#111C2D] mb-2">
                  Kebijakan Keterlambatan Peserta
                </div>
                <select
                  value={latePolicy}
                  onChange={(e) => setLatePolicy(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="strict">Ketat — Tidak dapat mulai setelah jadwal berakhir</option>
                  <option value="allow_with_deduction">Toleransi dengan pengurangan waktu tersisa</option>
                  <option value="flexible">Fleksibel — Durasi penuh selama jendela ujian buka</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#111C2D]">Langkah 5 — Pengaturan Hasil &amp; Kelulusan</h2>
            <div className="max-w-md">
              <label htmlFor="wiz-pass" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Nilai Minimum Kelulusan / KKM (Skala 0–100)
              </label>
              <input
                id="wiz-pass"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPublishResult}
                  onChange={(e) => setAutoPublishResult(e.target.checked)}
                  className="rounded border-slate-300 text-[#4A7C59]"
                />
                <span>
                  <strong>Publikasi Nilai Otomatis:</strong> Tampilkan skor objektif langsung setelah peserta mengumpulkan jawaban.
                </span>
              </label>

              <label className="flex items-center gap-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExplanation}
                  onChange={(e) => setShowExplanation(e.target.checked)}
                  className="rounded border-slate-300 text-[#4A7C59]"
                />
                <span>
                  <strong>Tampilkan Pembahasan Soal:</strong> Peserta dapat mempelajari pembahasan ilmiah setelah ujian selesai.
                </span>
              </label>

              <label className="flex items-center gap-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCorrectAnswer}
                  onChange={(e) => setShowCorrectAnswer(e.target.checked)}
                  className="rounded border-slate-300 text-[#4A7C59]"
                />
                <span>
                  <strong>Tampilkan Indikator Jawaban Benar:</strong> Perlihatkan status benar/salah per butir soal pada halaman hasil.
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#111C2D]">Langkah 6 — Pratinjau &amp; Publikasi Kegiatan</h2>

            {validationMessages.length > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1 text-xs text-[#DC2626]">
                <div className="font-bold">Persyaratan Wajib Belum Terpenuhi:</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationMessages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8F9F7] p-5 rounded-xl border border-[#E2E8F0] text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500">Judul Kegiatan:</span>{' '}
                  <strong className="text-[#111C2D]">{title || '(Belum diisi)'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Jenis Asesmen:</span>{' '}
                  <strong className="text-[#4A7C59]">{TYPE_LABELS[assessmentType]}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Jenjang &amp; Bidang:</span>{' '}
                  <strong className="text-[#111C2D]">
                    {educationLevel} · {subject || '(Belum diisi)'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Penyelenggara:</span>{' '}
                  <strong className="text-[#111C2D]">{organizer}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-500">Jumlah Soal &amp; Bobot:</span>{' '}
                  <strong className="font-mono-tabular text-[#111C2D]">
                    {selectedQuestionIds.length} Butir ({totalSelectedPoints} Poin)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Durasi &amp; KKM:</span>{' '}
                  <strong className="font-mono-tabular text-[#111C2D]">
                    {durationMinutes} Menit · KKM {passingScore}/100
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Kode Akses Ujian:</span>{' '}
                  <strong className="font-mono-tabular text-[#111C2D]">{accessCode}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Pengacakan:</span>{' '}
                  <strong className="text-[#111C2D]">
                    {shuffleQuestions ? 'Acak Soal' : 'Urut Tetap'} /{' '}
                    {shuffleOptions ? 'Acak Opsi' : 'Opsi Tetap'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg"
              >
                Simpan Draf
              </button>
              <button
                type="button"
                onClick={() => {
                  const errs = validateConfiguration();
                  if (errs.length === 0) {
                    addToast('success', 'Validasi Berhasil', 'Seluruh persyaratan wajib telah terpenuhi dan siap diterbitkan.');
                  }
                }}
                className="px-4 py-2.5 bg-[#F8F9F7] border border-[#E2E8F0] hover:bg-slate-100 text-[#111C2D] text-xs font-semibold rounded-lg"
              >
                Validasi Kegiatan
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="px-5 py-2.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Terbitkan Kegiatan</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Bottom Navigation */}
        <div className="pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg disabled:opacity-40 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Langkah Sebelumnya</span>
          </button>

          {step < 6 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(6, s + 1))}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#111C2D] hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
            >
              <span>Langkah Berikutnya</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assessments, questions, startOrResumeAttempt, addToast } = useApp();

  const assessment = assessments.find((a) => a.id === id) || assessments[0];
  const assignedQuestions = questions.filter((q) => assessment.questionIds.includes(q.id));

  const copyJoinLink = () => {
    const url = buildParticipantJoinUrl(window.location.origin, assessment.accessCode, {
      includeToken: true,
      examToken: assessment.examToken || 'BIO202',
    });
    navigator.clipboard?.writeText(url).catch(() => {});
    addToast('success', 'Tautan Ujian Disalin', `Tautan akses ${url} siap dibagikan.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <Link
            to="/activities"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Daftar Kegiatan Asesmen</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111C2D]">{assessment.title}</h1>
          <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mt-1">
            <span className="font-semibold text-[#4A7C59]">{TYPE_LABELS[assessment.assessmentType]}</span>
            <span>·</span>
            <span>{assessment.educationLevel}</span>
            <span>·</span>
            <span>{assessment.subject}</span>
            <span>·</span>
            <span className="font-mono-tabular">Versi {assessment.version}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyJoinLink}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg"
          >
            Salin Tautan / Kode ({assessment.accessCode})
          </button>
          <Link
            to={`/activities/${assessment.id}/edit`}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg"
          >
            Edit Konfigurasi
          </Link>
          <Link
            to={`/activities/${assessment.id}/command-center`}
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg"
          >
            Buka Command Center
          </Link>
          <button
            type="button"
            onClick={() => {
              const att = startOrResumeAttempt(assessment.id);
              navigate(`/exam/${att.id}`);
            }}
            className="px-4 py-2 bg-[#111C2D] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Mulai Sesi Ujian</span>
          </button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#111C2D]">Deskripsi &amp; Tujuan Asesmen</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{assessment.description}</p>
          <div className="pt-3 border-t border-[#E2E8F0] text-xs space-y-1.5">
            <div>
              <span className="text-slate-500">Tujuan:</span>{' '}
              <span className="font-medium text-[#111C2D]">{assessment.objective}</span>
            </div>
            <div>
              <span className="text-slate-500">Penyelenggara:</span>{' '}
              <span className="font-medium text-[#111C2D]">{assessment.organizer}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3 text-xs">
          <h2 className="text-base font-bold text-[#111C2D]">Parameter Pelaksanaan</h2>
          <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
            <span className="text-slate-500">Kode Akses Ujian</span>
            <span className="font-mono-tabular font-bold text-[#111C2D]">{assessment.accessCode}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
            <span className="text-slate-500">Durasi Pengerjaan</span>
            <span className="font-mono-tabular font-semibold">{assessment.durationMinutes} Menit</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
            <span className="text-slate-500">Nilai Minimum Lulus (KKM)</span>
            <span className="font-mono-tabular font-semibold">{assessment.passingScore}/100</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-500">Jumlah Butir Soal</span>
            <span className="font-mono-tabular font-semibold">{assignedQuestions.length} Soal</span>
          </div>
        </div>
      </div>

      {/* Question Snapshot List */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111C2D]">
            Daftar Butir Soal dalam Kegiatan Ini ({assignedQuestions.length} Soal)
          </h2>
          <Link to="/question-bank" className="text-xs font-semibold text-[#4A7C59] hover:underline">
            Kelola di Bank Soal →
          </Link>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {assignedQuestions.map((q, idx) => (
            <div key={q.id} className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono-tabular font-bold text-[#111C2D]">Soal #{idx + 1}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#4A7C59]">{q.questionType}</span>
                  <span>·</span>
                  <span>{q.category}</span>
                  <span>·</span>
                  <span className="font-mono-tabular">{q.points} Poin</span>
                </div>
                <p className="text-xs text-[#111C2D] leading-relaxed">{q.prompt}</p>
              </div>
              <Link
                to={`/question-bank/${q.id}/edit`}
                className="text-xs font-medium text-slate-500 hover:text-[#111C2D] shrink-0"
              >
                Edit Soal
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
