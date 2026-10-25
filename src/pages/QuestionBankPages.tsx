import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Bold,
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileUp,
  Italic,
  List,
  Plus,
  Search,
  Sigma,
  Table,
  Tag,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DifficultyLevel,
  EducationLevel,
  MatchingPair,
  Question,
  QuestionOption,
  QuestionType,
} from '../types/assessment';
import { DiagramStimulus } from '../components/DiagramStimulus';
import { QuestionBankFileUpload } from '../components/QuestionBankFileUpload';
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
import {
  addQuestionTag,
  collectTopicTagsWithCounts,
  DIFFICULTY_TAG_CONFIG,
  filterQuestionsByTagsAndCriteria,
  getEffectiveQuestionTags,
  MAX_QUESTION_TAGS,
  normalizeQuestionTag,
  PRESET_TOPIC_TAGS,
  removeQuestionTag,
} from '../utils/questionTags';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Pilihan Ganda (1 Jawaban)',
  multiple_choice: 'Pilihan Ganda Kompleks',
  true_false: 'Benar atau Salah',
  short_answer: 'Isian Singkat',
  numeric: 'Jawaban Numerik',
  matching: 'Menjodohkan',
  ordering: 'Mengurutkan',
  essay: 'Esai / Uraian',
  image_question: 'Soal Berbasis Gambar / Diagram',
  stimulus_case: 'Studi Kasus / Bacaan & Tabel',
};

export const QuestionBankListPage: React.FC = () => {
  const {
    currentUser,
    questions,
    globalSearch,
    toggleQuestionDraftStatus,
    duplicateQuestion,
    archiveQuestion,
    importQuestionsBatch,
    addToast,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus =
    searchParams.get('status') === 'draft'
      ? 'draft'
      : searchParams.get('status') === 'all'
      ? 'all'
      : 'published';

  const initialTagParam = searchParams.get('tag') ? [searchParams.get('tag')!] : [];
  const initialDiffParam = searchParams.get('difficulty') || 'all';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'published' | 'draft' | 'all'>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>(initialDiffParam);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTagParam);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Import Modal State
  const bankFileInputRef = useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<'excel_table' | 'json' | 'csv'>('excel_table');
  const [importRows, setImportRows] = useState<SpreadsheetQuestionRow[]>(() =>
    DEFAULT_TEMPLATE_ROWS.map((r) => ({ ...r }))
  );
  const [importRawText, setImportRawText] = useState(
    JSON.stringify(
      [
        {
          prompt: 'Manakah protokol standar yang digunakan untuk sinkronisasi waktu pada jaringan komputer?',
          questionType: 'single_choice',
          category: 'Jaringan Komputer',
          topic: 'Protokol Waktu (NTP)',
          tags: ['Jaringan Komputer', 'Protokol Waktu (NTP)'],
          difficulty: 'mudah',
          points: 10,
          explanation: 'NTP (Network Time Protocol) beroperasi pada port UDP 123.',
        },
      ],
      null,
      2
    )
  );
  const [importReport, setImportReport] = useState<{
    imported: number;
    errors: string[];
    duplicates: number;
  } | null>(null);

  const queryText = (search || globalSearch).trim().toLowerCase();

  const statusScopedQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (Boolean(q.isArchived) !== showArchived) return false;
      const isQDraft = Boolean(q.isDraft || q.status === 'draft');
      if (statusFilter === 'published' && isQDraft) return false;
      if (statusFilter === 'draft' && !isQDraft) return false;
      return true;
    });
  }, [questions, showArchived, statusFilter]);

  const counts = useMemo(() => {
    const nonArchived = questions.filter((q) => Boolean(q.isArchived) === showArchived);
    const draftCount = nonArchived.filter((q) => Boolean(q.isDraft || q.status === 'draft')).length;
    const publishedCount = nonArchived.length - draftCount;
    return { publishedCount, draftCount, allCount: nonArchived.length };
  }, [questions, showArchived]);

  const difficultyCounts = useMemo(() => {
    return {
      mudah: statusScopedQuestions.filter((q) => q.difficulty === 'mudah').length,
      sedang: statusScopedQuestions.filter((q) => q.difficulty === 'sedang').length,
      sulit: statusScopedQuestions.filter((q) => q.difficulty === 'sulit').length,
    };
  }, [statusScopedQuestions]);

  const availableTopicTags = useMemo(() => {
    return collectTopicTagsWithCounts(statusScopedQuestions);
  }, [statusScopedQuestions]);

  const toggleTopicTagFilter = (tag: string) => {
    const cleaned = normalizeQuestionTag(tag);
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === cleaned.toLowerCase());
      return exists
        ? prev.filter((t) => t.toLowerCase() !== cleaned.toLowerCase())
        : [...prev, cleaned];
    });
  };

  const resetAllTagFilters = () => {
    setSelectedTags([]);
    setDifficultyFilter('all');
    setTypeFilter('all');
    setSearch('');
  };

  const filtered = useMemo(() => {
    return filterQuestionsByTagsAndCriteria(questions, {
      showArchived,
      statusFilter,
      typeFilter,
      difficultyFilter,
      selectedTags,
      queryText,
    });
  }, [questions, showArchived, statusFilter, typeFilter, difficultyFilter, selectedTags, queryText]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = () => {
    selectedIds.forEach((id) => archiveQuestion(id));
    setSelectedIds([]);
    addToast('success', 'Aksi Massal Selesai', `${selectedIds.length} soal telah diperbarui status arsipnya.`);
  };

  const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          const parsedRows = parseExcelBufferToRows(reader.result);
          if (parsedRows.length > 0) {
            setImportRows(parsedRows);
            setImportFormat('excel_table');
            const items = convertSpreadsheetRowsToQuestions(parsedRows);
            const res = importQuestionsBatch(items);
            setImportReport(res);
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
        setImportRawText(reader.result);
        if (isJson) {
          setImportFormat('json');
          try {
            const parsedJson = JSON.parse(reader.result);
            if (Array.isArray(parsedJson)) {
              const res = importQuestionsBatch(parsedJson);
              setImportReport(res);
            }
          } catch {
            setImportReport(null);
          }
        } else {
          const parsed = parseDelimitedTextToRows(reader.result);
          if (parsed.length > 0) {
            setImportRows(parsed);
            setImportFormat('excel_table');
            const items = convertSpreadsheetRowsToQuestions(parsed);
            const res = importQuestionsBatch(items);
            setImportReport(res);
          } else {
            setImportFormat('csv');
            setImportReport(null);
          }
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRunImport = () => {
    try {
      if (importFormat === 'json') {
        const parsed = JSON.parse(importRawText);
        if (!Array.isArray(parsed)) {
          setImportReport({
            imported: 0,
            errors: ['Format JSON harus berupa array objek soal [...]'],
            duplicates: 0,
          });
          return;
        }
        const res = importQuestionsBatch(parsed);
        setImportReport(res);
      } else if (importFormat === 'excel_table') {
        const items = convertSpreadsheetRowsToQuestions(importRows);
        const res = importQuestionsBatch(items);
        setImportReport(res);
      } else {
        const parsedRows = parseDelimitedTextToRows(importRawText);
        const items = convertSpreadsheetRowsToQuestions(parsedRows);
        const res = importQuestionsBatch(items);
        setImportReport(res);
      }
    } catch (err: any) {
      setImportReport({
        imported: 0,
        errors: [`Kesalahan struktur data: ${err.message || 'Format tidak valid'}`],
        duplicates: 0,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span> Bank Soal Terpadu
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">Bank Soal Multi-Tipe</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Kelola 10 jenis butir soal yang dapat digunakan kembali lintas kegiatan pretest, posttest, dan kuis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setImportReport(null);
              setImportOpen(true);
            }}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Impor CSV / JSON</span>
          </button>
          <Link
            to="/question-bank/new"
            className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Soal Baru</span>
          </Link>
        </div>
      </div>

      {/* Dedicated File-Upload Component for Automatic CSV/Excel Template Parsing into Database */}
      <QuestionBankFileUpload
        onImportQuestions={importQuestionsBatch}
        onNotify={addToast}
        onOpenAdvancedModal={() => {
          setImportReport(null);
          setImportOpen(true);
        }}
      />

      {/* Status Tabs: Active Bank vs Drafts (Work-in-Progress) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('published');
              setSearchParams({});
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'published'
                ? 'bg-[#4A7C59] text-white'
                : 'bg-[#F8F9F7] text-slate-600 hover:text-[#111C2D]'
            }`}
          >
            Bank Soal Aktif ({counts.publishedCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('draft');
              setSearchParams({ status: 'draft' });
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'draft'
                ? 'bg-[#D97706] text-white'
                : 'bg-[#F8F9F7] text-slate-600 hover:text-[#111C2D]'
            }`}
          >
            Draf Soal / Work-in-Progress ({counts.draftCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchParams({ status: 'all' });
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#111C2D] text-white'
                : 'bg-[#F8F9F7] text-slate-600 hover:text-[#111C2D]'
            }`}
          >
            Semua Status ({counts.allCount})
          </button>
        </div>

        <span className="text-xs text-slate-500">
          {statusFilter === 'draft'
            ? 'Menampilkan soal draf (belum dipublikasikan ke Bank Soal aktif)'
            : statusFilter === 'published'
            ? 'Menampilkan soal aktif yang siap digunakan pada kegiatan asesmen'
            : 'Menampilkan seluruh soal aktif dan draf'}
        </span>
      </div>

      {/* Filters & Bulk Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari teks soal, kategori, topik, atau #tag..."
                aria-label="Cari soal"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter jenis soal"
              className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
            >
              <option value="all">Semua Jenis Soal (10 Tipe)</option>
              {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              aria-label="Filter tingkat kesulitan"
              className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
            >
              <option value="all">Semua Tingkat Kesulitan</option>
              <option value="mudah">Mudah (C1–C2)</option>
              <option value="sedang">Sedang (C3–C4)</option>
              <option value="sulit">Sulit / HOTS (C5–C6)</option>
            </select>

            <select
              value={selectedTags.length === 1 ? selectedTags[0] : 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTags(val === 'all' ? [] : [val]);
              }}
              aria-label="Filter tag topik"
              className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
            >
              <option value="all">Semua Tag Topik ({availableTopicTags.length} Tag)</option>
              {availableTopicTags.map((item) => (
                <option key={item.tag} value={item.tag}>
                  #{item.tag} ({item.count} soal)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                showArchived
                  ? 'bg-[#111C2D] text-white border-[#111C2D]'
                  : 'bg-[#F8F9F7] text-slate-600 border-[#E2E8F0]'
              }`}
            >
              {showArchived ? 'Menampilkan Arsip' : 'Tampilkan Arsip'}
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#4A7C59]">
                {selectedIds.length} dipilih
              </span>
              <button
                type="button"
                onClick={handleBulkArchive}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200 rounded-lg"
              >
                Arsipkan Massal
              </button>
            </div>
          )}
        </div>

        {/* Interactive Topic & Difficulty Tag Filter Bar */}
        <div
          data-testid="question-bank-tag-filter-bar"
          className="pt-3 border-t border-[#E2E8F0] space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111C2D]">
              <Tag className="w-3.5 h-3.5 text-[#4A7C59]" />
              <span>Filter Cepat berdasarkan Sistem Tag (Tingkat Kesulitan &amp; Topik):</span>
            </div>

            {(selectedTags.length > 0 || difficultyFilter !== 'all' || typeFilter !== 'all' || search) && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#4A7C59]">
                  Menampilkan {filtered.length} dari {statusScopedQuestions.length} soal
                </span>
                <button
                  type="button"
                  onClick={resetAllTagFilters}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#DC2626] bg-red-50 hover:bg-red-100 border border-red-200 rounded-md flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reset Filter Tag</span>
                </button>
              </div>
            )}
          </div>

          {/* Difficulty Level Tag Filter Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Tag Kesulitan:
            </span>
            <button
              type="button"
              onClick={() => setDifficultyFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                difficultyFilter === 'all'
                  ? 'bg-[#111C2D] text-white border-[#111C2D]'
                  : 'bg-[#F8F9F7] text-slate-600 border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              Semua Level ({statusScopedQuestions.length})
            </button>
            {(['mudah', 'sedang', 'sulit'] as DifficultyLevel[]).map((level) => {
              const meta = DIFFICULTY_TAG_CONFIG[level];
              const isSelected = difficultyFilter === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficultyFilter(isSelected ? 'all' : level)}
                  aria-label={`Filter tag kesulitan ${meta.shortLabel}`}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    isSelected ? meta.activeButtonClass : `${meta.badgeClass} hover:opacity-90`
                  }`}
                >
                  Kesulitan: {meta.shortLabel} ({difficultyCounts[level]})
                </button>
              );
            })}
          </div>

          {/* Topic & Category Tag Filter Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Tag Topik &amp; Kategori:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                selectedTags.length === 0
                  ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                  : 'bg-[#F8F9F7] text-slate-600 border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              Semua Topik
            </button>
            {availableTopicTags.map((item) => {
              const isSelected = selectedTags.some(
                (t) => t.toLowerCase() === item.tag.toLowerCase()
              );
              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => toggleTopicTagFilter(item.tag)}
                  aria-label={`Filter tag topik ${item.tag}`}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#4A7C59] text-white border-[#4A7C59] font-semibold'
                      : 'bg-[#F8F9F7] text-[#111C2D] border-[#E2E8F0] hover:border-[#4A7C59]/50 hover:bg-[#EEF4F0]/60'
                  }`}
                >
                  <span>#{item.tag}</span>
                  <span
                    className={`font-mono-tabular text-[10px] px-1 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question Items List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center space-y-2">
          <div className="text-sm font-bold text-[#111C2D]">
            {statusFilter === 'draft'
              ? 'Belum Ada Butir Soal Berstatus Draf'
              : 'Tidak Ada Butir Soal yang Cocok'}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter === 'draft'
              ? 'Anda dapat menyimpan soal yang sedang dikerjakan menggunakan tombol "Save as Draft (Simpan sebagai Draf)" pada Editor Butir Soal.'
              : 'Ubah filter tag topik / tingkat kesulitan Anda atau buat butir soal baru.'}
          </p>
          {(selectedTags.length > 0 || difficultyFilter !== 'all') && (
            <button
              type="button"
              onClick={resetAllTagFilters}
              className="mt-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4A7C59] rounded-lg"
            >
              Reset Filter Tag
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const isQDraft = Boolean(q.isDraft || q.status === 'draft');
            const effectiveTags = getEffectiveQuestionTags(q);
            const diffMeta = DIFFICULTY_TAG_CONFIG[q.difficulty] || DIFFICULTY_TAG_CONFIG.sedang;
            return (
              <div
                key={q.id}
                className={`bg-white border rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                  isQDraft ? 'border-amber-300 bg-amber-50/20' : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    aria-label={`Pilih soal ${q.id}`}
                    className="mt-1 rounded border-slate-300 text-[#4A7C59]"
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-[#111C2D]">{q.id}</span>
                      <span>·</span>
                      {isQDraft ? (
                        <span className="font-bold text-[#D97706]">
                          DRAF (Belum Dipublikasikan)
                        </span>
                      ) : (
                        <span className="font-semibold text-[#16A34A]">Aktif di Bank Soal</span>
                      )}
                      <span>·</span>
                      <span className="font-semibold text-[#4A7C59]">
                        {QUESTION_TYPE_LABELS[q.questionType]}
                      </span>
                      <span>·</span>
                      <span>
                        {q.category} ({q.topic})
                      </span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDifficultyFilter((prev) =>
                            prev === q.difficulty ? 'all' : q.difficulty
                          )
                        }
                        title="Klik untuk memfilter berdasarkan tingkat kesulitan ini"
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors ${diffMeta.badgeClass}`}
                      >
                        Kesulitan: {diffMeta.shortLabel} ({diffMeta.cognitiveLevel})
                      </button>
                      <span>·</span>
                      <span className="font-mono-tabular font-bold text-[#111C2D]">
                        Bobot {q.points} Poin
                      </span>
                    </div>

                    {q.stimulusText && (
                      <div className="p-3 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-xs text-slate-700">
                        {q.stimulusText}
                      </div>
                    )}

                    <p className="text-sm font-medium text-[#111C2D] leading-relaxed">{q.prompt}</p>

                    {/* Topic & Category Tag Chips on Question Card */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {effectiveTags.map((tag) => {
                        const isTagActive = selectedTags.some(
                          (t) => t.toLowerCase() === tag.toLowerCase()
                        );
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTopicTagFilter(tag)}
                            title={`Filter Bank Soal dengan tag #${tag}`}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors flex items-center gap-1 ${
                              isTagActive
                                ? 'bg-[#4A7C59] text-white border-[#4A7C59] font-semibold'
                                : 'bg-[#EEF4F0]/70 text-[#3D6849] border-[#4A7C59]/25 hover:bg-[#EEF4F0]'
                            }`}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span>#{tag}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-xs text-slate-500">
                      Pembuat: {q.authorName} · Jenjang: {q.educationLevel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start">
                  {isQDraft && (
                    <button
                      type="button"
                      onClick={() => toggleQuestionDraftStatus(q.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4A7C59] hover:bg-[#3D6849] rounded-lg flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Publikasikan</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewQuestion(q)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#111C2D] bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau</span>
                  </button>
                  <Link
                    to={`/question-bank/${q.id}/edit`}
                    className="p-2 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    aria-label={`Edit soal ${q.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(q.id)}
                    className="p-2 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    aria-label={`Duplikasi soal ${q.id}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveQuestion(q.id)}
                    className="p-2 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                    aria-label={`Arsipkan soal ${q.id}`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="text-xs font-semibold text-[#4A7C59]">
                  Pratinjau Butir Soal · {QUESTION_TYPE_LABELS[previewQuestion.questionType]}
                </div>
                <h3 className="text-base font-bold text-[#111C2D]">
                  {previewQuestion.category} — {previewQuestion.topic}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="text-xs font-semibold text-slate-500 hover:text-[#111C2D]"
              >
                Tutup ✕
              </button>
            </div>

            {previewQuestion.questionType === 'image_question' && (
              <DiagramStimulus type={previewQuestion.svgDiagramType} />
            )}

            {previewQuestion.stimulusText && (
              <div className="p-4 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-xs text-slate-700 leading-relaxed">
                {previewQuestion.stimulusText}
              </div>
            )}

            <p className="text-sm font-semibold text-[#111C2D]">{previewQuestion.prompt}</p>

            {previewQuestion.options && previewQuestion.options.length > 0 && (
              <div className="space-y-2">
                {previewQuestion.options.map((opt) => {
                  const isKey = previewQuestion.correctOptionIds?.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                        isKey
                          ? 'border-[#4A7C59] bg-[#EEF4F0] font-semibold'
                          : 'border-[#E2E8F0] bg-[#F8F9F7]'
                      }`}
                    >
                      <span>
                        <strong>{opt.label}.</strong> {opt.text}
                      </span>
                      {isKey && (
                        <span className="text-[#4A7C59] font-semibold">Kunci Jawaban ✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-xs space-y-1">
              <div className="font-semibold text-[#111C2D]">Pembahasan Ilmiah (Terlindungi dari Peserta Saat Ujian):</div>
              <p className="text-slate-600">{previewQuestion.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#111C2D]">
                  Impor Butir Soal Massal (Excel .xlsx Kolom Terpisah / CSV / JSON)
                </h3>
                <p className="text-xs text-slate-500">
                  Masing-masing atribut soal dipisahkan ke dalam 9 kolom tersendiri (Kolom A s.d. Kolom I).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-xs text-slate-500 hover:text-[#111C2D]"
              >
                Tutup ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportFormat('excel_table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                    importFormat === 'excel_table'
                      ? 'bg-[#4A7C59] text-white'
                      : 'bg-[#F8F9F7] text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tabel Kolom Terpisah (Excel .xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportFormat('csv');
                    setImportRawText(
                      'prompt;questionType;optionA;optionB;optionC;optionD;correctAnswer;points;explanation\nApakah fotosintesis menghasilkan oksigen?;true_false;Pernyataan Benar;Pernyataan Salah;;;A;10;Fotosintesis melepaskan O2.'
                    );
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    importFormat === 'csv'
                      ? 'bg-[#4A7C59] text-white'
                      : 'bg-[#F8F9F7] text-slate-600'
                  }`}
                >
                  Format CSV
                </button>
                <button
                  type="button"
                  onClick={() => setImportFormat('json')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    importFormat === 'json'
                      ? 'bg-[#4A7C59] text-white'
                      : 'bg-[#F8F9F7] text-slate-600'
                  }`}
                >
                  Format JSON
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={bankFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json,.txt"
                  onChange={handleBankFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bankFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#111C2D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Pilih Berkas Excel (.xlsx) / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadExcelQuestionTemplate(importRows, 'template-impor-soal-asesmen-askia.xlsx');
                    addToast(
                      'success',
                      'Template Excel (.xlsx) Diunduh',
                      'Berkas Excel dengan 9 kolom terpisah berhasil diunduh.'
                    );
                  }}
                  className="px-3 py-1.5 bg-[#16A34A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Unduh Template Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCsvQuestionTemplate(importRows, 'template-impor-soal-asesmen-askia.csv');
                    addToast(
                      'success',
                      'Template CSV Diunduh',
                      'Berkas CSV dengan pemisah kolom otomatis untuk Excel berhasil diunduh.'
                    );
                  }}
                  className="px-3 py-1.5 bg-[#F8F9F7] border border-[#E2E8F0] text-[#111C2D] text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
                  <span>Unduh CSV</span>
                </button>
              </div>
            </div>

            {importFormat === 'excel_table' ? (
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
                          className="py-2 px-2.5 border-r border-[#E2E8F0] min-w-[125px]"
                        >
                          <div className="text-[10px] font-mono-tabular font-semibold text-[#4A7C59]">
                            Kolom {String.fromCharCode(65 + cIdx)}
                          </div>
                          <div className="font-mono-tabular font-bold text-[#111C2D]">
                            {col.header}
                          </div>
                          <div className="text-[10px] font-normal text-slate-500">{col.label}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {importRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2 font-mono-tabular text-center text-slate-500 border-r border-[#E2E8F0]">
                          {rIdx + 1}
                        </td>
                        {SPREADSHEET_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className="p-1.5 border-r border-[#E2E8F0] min-w-[125px]"
                          >
                            <input
                              type={col.key === 'points' ? 'number' : 'text'}
                              value={row[col.key]}
                              onChange={(e) =>
                                setImportRows((prev) =>
                                  prev.map((item, idx) =>
                                    idx === rIdx
                                      ? {
                                          ...item,
                                          [col.key]:
                                            col.key === 'points'
                                              ? Number(e.target.value) || 0
                                              : e.target.value,
                                        }
                                      : item
                                  )
                                )
                              }
                              aria-label={`Baris ${rIdx + 1} ${col.header}`}
                              className="w-full px-2 py-1 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <textarea
                rows={7}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                aria-label="Data impor soal"
                className="w-full p-3 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
              />
            )}

            {importReport && (
              <div className="p-3.5 rounded-lg bg-[#F8F9F7] border border-[#E2E8F0] text-xs space-y-1">
                <div className="font-semibold text-[#111C2D]">
                  Hasil Validasi &amp; Impor: {importReport.imported} soal berhasil diimpor ·{' '}
                  {importReport.duplicates} indikasi duplikasi terdeteksi.
                </div>
                {importReport.errors.map((err, i) => (
                  <div key={i} className="text-[#DC2626]">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Selesai
              </button>
              <button
                type="button"
                onClick={handleRunImport}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#4A7C59] hover:bg-[#3D6849] rounded-lg"
              >
                Validasi &amp; Impor Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const QuestionEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, questions, saveQuestion, addToast } = useApp();

  const existing = questions.find((q) => q.id === id);

  const [questionType, setQuestionType] = useState<QuestionType>(
    existing?.questionType || 'single_choice'
  );
  const [prompt, setPrompt] = useState(existing?.prompt || '');
  const [stimulusText, setStimulusText] = useState(existing?.stimulusText || '');
  const [category, setCategory] = useState(existing?.category || 'Biologi Molekuler');
  const [topic, setTopic] = useState(existing?.topic || 'Metabolisme Sel');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(existing?.difficulty || 'sedang');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    existing?.educationLevel || 'SMA/SMK/MA'
  );
  const [points, setPoints] = useState(existing?.points || 10);
  const [explanation, setExplanation] = useState(existing?.explanation || '');
  const [reference, setReference] = useState(existing?.reference || '');

  // Options for choice types
  const [options, setOptions] = useState<QuestionOption[]>(
    existing?.options || [
      { id: 'opt-a', label: 'A', text: 'Pilihan Jawaban A' },
      { id: 'opt-b', label: 'B', text: 'Pilihan Jawaban B' },
      { id: 'opt-c', label: 'C', text: 'Pilihan Jawaban C' },
      { id: 'opt-d', label: 'D', text: 'Pilihan Jawaban D' },
    ]
  );
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    existing?.correctOptionIds || ['opt-a']
  );

  // Short answer / Numeric / Matching / Ordering
  const [shortAnswerKey, setShortAnswerKey] = useState(
    existing?.correctShortAnswers?.join(', ') || 'AUG'
  );
  const [numericValue, setNumericValue] = useState(existing?.correctNumericValue ?? 0.42);
  const [numericTolerance, setNumericTolerance] = useState(existing?.numericTolerance ?? 0.01);
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(
    existing?.matchingPairs || [
      { id: 'p-1', leftText: 'Konsep A', rightText: 'Definisi Pasangan A' },
      { id: 'p-2', leftText: 'Konsep B', rightText: 'Definisi Pasangan B' },
    ]
  );
  const [orderText, setOrderText] = useState(
    existing?.correctOrder?.join('\n') || 'Tahap Pertama\nTahap Kedua\nTahap Ketiga'
  );
  const [isDraft, setIsDraft] = useState<boolean>(
    Boolean(existing?.isDraft || existing?.status === 'draft')
  );
  const [tags, setTags] = useState<string[]>(() =>
    existing
      ? getEffectiveQuestionTags(existing)
      : ['Metabolisme Sel', 'Biologi Molekuler']
  );
  const [tagInput, setTagInput] = useState<string>('');

  const suggestedTopicTags = useMemo(() => {
    const fromBank = collectTopicTagsWithCounts(questions).map((c) => c.tag);
    const merged = Array.from(new Set([...PRESET_TOPIC_TAGS, ...fromBank]));
    return merged.slice(0, 14);
  }, [questions]);

  const handleAddTagFromInput = () => {
    const cleaned = normalizeQuestionTag(tagInput);
    if (!cleaned) return;
    if (tags.length >= MAX_QUESTION_TAGS) {
      addToast(
        'warning',
        'Batas Maksimum Tag Tercapai',
        `Maksimal ${MAX_QUESTION_TAGS} tag topik per butir soal.`
      );
      return;
    }
    const nextTags = addQuestionTag(tags, tagInput);
    setTags(nextTags);
    if (!topic.trim() || topic === 'Metabolisme Sel') {
      setTopic(cleaned);
    }
    setTagInput('');
  };

  const handleToggleSuggestedTag = (presetTag: string) => {
    const exists = tags.some((t) => t.toLowerCase() === presetTag.toLowerCase());
    if (exists) {
      setTags((prev) => removeQuestionTag(prev, presetTag));
    } else {
      if (tags.length >= MAX_QUESTION_TAGS) {
        addToast(
          'warning',
          'Batas Maksimum Tag Tercapai',
          `Maksimal ${MAX_QUESTION_TAGS} tag topik per butir soal.`
        );
        return;
      }
      setTags((prev) => addQuestionTag(prev, presetTag));
      if (!topic.trim() || topic === 'Metabolisme Sel') {
        setTopic(presetTag);
      }
    }
  };

  const insertFormattingSnippet = (snippet: string) => {
    setPrompt((prev) => `${prev} ${snippet}`.trim());
  };

  const saveQuestionWithDraftState = (draftMode: boolean) => {
    const trimmedPrompt = prompt.trim();
    if (!draftMode && trimmedPrompt.length < 5) {
      addToast(
        'error',
        'Pertanyaan Belum Lengkap',
        'Masukkan teks pertanyaan minimal 5 karakter untuk mempublikasikan ke Bank Soal aktif, atau aktifkan "Save as Draft".'
      );
      return;
    }

    const finalPrompt =
      trimmedPrompt.length > 0 ? trimmedPrompt : '[Draf Soal Sedang Disusun — Belum Ada Teks Pertanyaan]';

    const pendingTagInput = normalizeQuestionTag(tagInput);
    const mergedTags = getEffectiveQuestionTags({
      tags: pendingTagInput ? addQuestionTag(tags, pendingTagInput) : tags,
      topic: topic.trim() || 'Evaluasi',
      category: category.trim() || 'Umum',
    });

    const now = new Date().toISOString();
    const payload: Question = {
      id: existing?.id || `q-${Date.now()}`,
      ownerId: currentUser.uid,
      authorName: currentUser.fullName,
      organizationId: currentUser.organizationId,
      prompt: finalPrompt,
      stimulusText: stimulusText.trim() || undefined,
      svgDiagramType: questionType === 'image_question' ? 'cell_biology' : undefined,
      questionType,
      options:
        questionType === 'true_false'
          ? [
              { id: 'opt-tf-true', label: 'Benar', text: 'Pernyataan Benar' },
              { id: 'opt-tf-false', label: 'Salah', text: 'Pernyataan Salah' },
            ]
          : options,
      correctOptionIds,
      correctShortAnswers: shortAnswerKey
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      correctNumericValue: numericValue,
      numericTolerance,
      matchingPairs,
      correctOrder: orderText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      points,
      explanation: explanation.trim() || 'Pembahasan soal.',
      category: category.trim() || 'Umum',
      topic: topic.trim() || (mergedTags[0] ?? 'Evaluasi'),
      tags: mergedTags,
      difficulty,
      educationLevel,
      reference: reference.trim() || undefined,
      isDraft: draftMode,
      status: draftMode ? 'draft' : 'published',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    saveQuestion(payload);
    navigate(draftMode ? '/question-bank?status=draft' : '/question-bank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveQuestionWithDraftState(isDraft);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <Link
            to="/question-bank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A7C59] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Bank Soal</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#111C2D]">
              {existing ? `Edit Butir Soal (${existing.id})` : 'Editor Butir Soal Baru'}
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                isDraft
                  ? 'bg-amber-50 text-[#D97706] border-amber-200'
                  : 'bg-[#EEF4F0] text-[#4A7C59] border-[#4A7C59]/30'
              }`}
            >
              {isDraft ? 'Mode: Save as Draft (Work-in-Progress)' : 'Mode: Publikasikan ke Bank Aktif'}
            </span>
          </div>
        </div>

        {/* Header Save as Draft Status Toggle */}
        <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5">
          <div className="text-right">
            <div className="text-xs font-bold text-[#111C2D]">
              Save as Draft (Simpan sebagai Draf)
            </div>
            <div className="text-[11px] text-slate-500">
              {isDraft
                ? 'Disimpan sebagai draf, belum masuk ke Bank Soal aktif'
                : 'Langsung dipublikasikan ke Bank Soal aktif'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDraft}
            aria-label="Save as Draft"
            onClick={() => setIsDraft((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDraft ? 'bg-[#D97706]' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                isDraft ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Editor Column */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qe-type" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Jenis Butir Soal
              </label>
              <select
                id="qe-type"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="qe-points" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Bobot Nilai Soal (Poin)
              </label>
              <input
                id="qe-points"
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="qe-prompt" className="text-xs font-semibold text-[#111C2D]">
                Pertanyaan / Instruksi Soal *
              </label>
              <div className="flex items-center gap-1 bg-[#F8F9F7] p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => insertFormattingSnippet('**teks tebal**')}
                  className="p-1.5 text-slate-600 hover:text-[#111C2D]"
                  aria-label="Teks tebal"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormattingSnippet('*teks miring*')}
                  className="p-1.5 text-slate-600 hover:text-[#111C2D]"
                  aria-label="Teks miring"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormattingSnippet('\n• Butir 1\n• Butir 2')}
                  className="p-1.5 text-slate-600 hover:text-[#111C2D]"
                  aria-label="Daftar"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormattingSnippet('∑(p² + 2pq + q² = 1)')}
                  className="p-1.5 text-slate-600 hover:text-[#111C2D]"
                  aria-label="Rumus matematika"
                >
                  <Sigma className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStimulusText(
                      'TABEL STIMULUS: Perhatikan data pengamatan laju reaksi enzimatik pada variasi suhu 10°C, 37°C, dan 65°C.'
                    )
                  }
                  className="p-1.5 text-slate-600 hover:text-[#111C2D]"
                  aria-label="Sisipkan stimulus tabel"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              id="qe-prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tuliskan pertanyaan soal secara jelas, lengkap dengan rumus atau konteks..."
              required
              className="w-full p-3.5 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            />
          </div>

          {(questionType === 'stimulus_case' || stimulusText) && (
            <div>
              <label htmlFor="qe-stimulus" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Bacaan / Stimulus / Konteks Studi Kasus
              </label>
              <textarea
                id="qe-stimulus"
                rows={3}
                value={stimulusText}
                onChange={(e) => setStimulusText(e.target.value)}
                className="w-full p-3 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>
          )}

          {/* Dynamic Answer Key Configuration by Question Type */}
          {(questionType === 'single_choice' ||
            questionType === 'multiple_choice' ||
            questionType === 'image_question' ||
            questionType === 'stimulus_case') && (
            <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <div className="text-xs font-semibold text-[#111C2D]">
                Pilihan Jawaban &amp; Kunci Jawaban Benar
              </div>
              {options.map((opt, idx) => {
                const isChecked = correctOptionIds.includes(opt.id);
                return (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={questionType === 'multiple_choice' ? 'checkbox' : 'radio'}
                      name="correct-option"
                      checked={isChecked}
                      onChange={() => {
                        if (questionType === 'multiple_choice') {
                          setCorrectOptionIds((prev) =>
                            prev.includes(opt.id)
                              ? prev.filter((x) => x !== opt.id)
                              : [...prev, opt.id]
                          );
                        } else {
                          setCorrectOptionIds([opt.id]);
                        }
                      }}
                      aria-label={`Tandai opsi ${opt.label} sebagai kunci jawaban`}
                      className="text-[#4A7C59]"
                    />
                    <span className="text-xs font-bold w-6">{opt.label}.</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                        );
                      }}
                      aria-label={`Teks opsi ${opt.label}`}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {questionType === 'short_answer' && (
            <div>
              <label htmlFor="qe-short" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Kunci Jawaban Singkat yang Diterima (Pisahkan dengan koma)
              </label>
              <input
                id="qe-short"
                type="text"
                value={shortAnswerKey}
                onChange={(e) => setShortAnswerKey(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>
          )}

          {questionType === 'numeric' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="qe-num" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Nilai Numerik Tepat
                </label>
                <input
                  id="qe-num"
                  type="number"
                  step="any"
                  value={numericValue}
                  onChange={(e) => setNumericValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="qe-tol" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Toleransi Deviasi (±)
                </label>
                <input
                  id="qe-tol"
                  type="number"
                  step="any"
                  value={numericTolerance}
                  onChange={(e) => setNumericTolerance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>
            </div>
          )}

          {questionType === 'ordering' && (
            <div>
              <label htmlFor="qe-order" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Urutan Item yang Benar (Satu langkah per baris)
              </label>
              <textarea
                id="qe-order"
                rows={4}
                value={orderText}
                onChange={(e) => setOrderText(e.target.value)}
                className="w-full p-3 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>
          )}

          <div>
            <label htmlFor="qe-exp" className="block text-xs font-semibold text-[#111C2D] mb-1">
              Pembahasan &amp; Rasional Jawaban
            </label>
            <textarea
              id="qe-exp"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Tuliskan penjelasan mengapa kunci jawaban tersebut benar..."
              className="w-full p-3 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
            />
          </div>
        </div>

        {/* Metadata & Tag Categorization Sidebar */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 h-fit">
          <div>
            <h2 className="text-base font-bold text-[#111C2D]">
              Klasifikasi, Topik &amp; Sistem Tag
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kategorikan soal menggunakan tag topik dan tingkat kesulitan agar mudah difilter di Bank Soal.
            </p>
          </div>

          {/* Difficulty Level Tag Selector */}
          <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="qe-diff" className="text-xs font-bold text-[#111C2D]">
                Tag Tingkat Kesulitan (Difficulty Level)
              </label>
              <span className="text-[11px] font-mono-tabular font-semibold text-slate-500">
                {DIFFICULTY_TAG_CONFIG[difficulty].cognitiveLevel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Pilih Tag Tingkat Kesulitan">
              {(['mudah', 'sedang', 'sulit'] as DifficultyLevel[]).map((level) => {
                const meta = DIFFICULTY_TAG_CONFIG[level];
                const isSelected = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    aria-pressed={isSelected}
                    aria-label={`Tag kesulitan ${meta.shortLabel}`}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      isSelected ? meta.activeButtonClass : 'bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <div>{meta.shortLabel}</div>
                    <div className="text-[10px] opacity-80 font-normal">{meta.cognitiveLevel}</div>
                  </button>
                );
              })}
            </div>

            <select
              id="qe-diff"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              aria-label="Tingkat Kesulitan"
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="mudah">Mudah (C1–C2 · Pemahaman Dasar)</option>
              <option value="sedang">Sedang (C3–C4 · Penerapan &amp; Analisis)</option>
              <option value="sulit">Sulit / HOTS (C5–C6 · Evaluasi &amp; Sintesis)</option>
            </select>
          </div>

          {/* Topic & Category Tag System */}
          <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="qe-tag-input" className="text-xs font-bold text-[#111C2D] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#4A7C59]" />
                <span>Sistem Tag Topik &amp; Kategori</span>
              </label>
              <span className="text-[11px] font-mono-tabular font-semibold text-[#4A7C59]">
                {tags.length} / {MAX_QUESTION_TAGS} tag
              </span>
            </div>

            {/* Active Topic Tags */}
            <div
              data-testid="active-question-tags"
              className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-2 bg-white border border-[#E2E8F0] rounded-lg"
            >
              {tags.length === 0 ? (
                <span className="text-[11px] text-slate-400">
                  Belum ada tag topik. Tambahkan tag di bawah ini.
                </span>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#EEF4F0] text-[#3D6849] border border-[#4A7C59]/30 rounded-md"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => setTags((prev) => removeQuestionTag(prev, tag))}
                      aria-label={`Hapus tag ${tag}`}
                      className="text-slate-500 hover:text-[#DC2626] ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Custom Topic Tag Input */}
            <div className="flex items-center gap-1.5">
              <input
                id="qe-tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTagFromInput();
                  }
                }}
                placeholder="Ketik tag topik baru (mis. Bioteknologi CRISPR)..."
                aria-label="Tambah tag topik baru"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
              />
              <button
                type="button"
                onClick={handleAddTagFromInput}
                aria-label="Tambah Tag"
                className="px-3 py-1.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tag</span>
              </button>
            </div>

            {/* Quick-Add Suggested Topic Tags */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500">
                Pilih Cepat Tag Topik Populer:
              </div>
              <div className="flex flex-wrap gap-1">
                {suggestedTopicTags.map((preset) => {
                  const isAdded = tags.some((t) => t.toLowerCase() === preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleToggleSuggestedTag(preset)}
                      className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                        isAdded
                          ? 'bg-[#4A7C59] text-white border-[#4A7C59] font-semibold'
                          : 'bg-white text-slate-600 border-[#E2E8F0] hover:border-[#4A7C59]'
                      }`}
                    >
                      {isAdded ? `✓ #${preset}` : `+ #${preset}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div>
              <label htmlFor="qe-cat" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Kategori Mata Pelajaran / Bidang
              </label>
              <input
                id="qe-cat"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="qe-topic" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Topik Utama / Kompetensi Dasar
              </label>
              <input
                id="qe-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="qe-ref" className="block text-xs font-semibold text-[#111C2D] mb-1">
              Referensi Pustaka (Opsional)
            </label>
            <input
              id="qe-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Contoh: Campbell Biology Bab 9"
              className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
            />
          </div>

          {/* Status Publikasi & Save as Draft Toggle Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDraft
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-[#F8F9F7] border-[#E2E8F0]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="qe-save-as-draft"
                className="text-xs font-bold text-[#111C2D] cursor-pointer"
              >
                Save as Draft (Simpan sebagai Draf)
              </label>
              <input
                id="qe-save-as-draft"
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#D97706] focus:ring-[#D97706]"
              />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isDraft
                ? 'Status Draf aktif: Soal yang sedang dikerjakan (work-in-progress) akan disimpan ke tab Draf tanpa langsung dipublikasikan ke Bank Soal aktif.'
                : 'Status Publikasi aktif: Soal akan langsung diterbitkan ke Bank Soal aktif dan siap dipilih pada kegiatan asesmen.'}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className={`w-full py-2.5 px-4 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                isDraft
                  ? 'bg-[#D97706] hover:bg-amber-700'
                  : 'bg-[#4A7C59] hover:bg-[#3D6849]'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isDraft
                  ? 'Simpan sebagai Draf (Save as Draft)'
                  : 'Simpan & Publikasikan ke Bank Soal'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => saveQuestionWithDraftState(!isDraft)}
              className="w-full py-2 px-4 bg-[#F8F9F7] hover:bg-slate-100 text-[#111C2D] border border-[#E2E8F0] text-xs font-semibold rounded-lg transition-colors"
            >
              {isDraft
                ? 'Atau Langsung Publikasikan ke Bank Aktif'
                : 'Simpan Cepat sebagai Draf (Save as Draft)'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
