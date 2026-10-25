import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  FileUp,
  Table,
  Tag,
  X,
} from 'lucide-react';
import { DifficultyLevel, Question } from '../types/assessment';
import {
  DEFAULT_TEMPLATE_ROWS,
  SPREADSHEET_COLUMNS,
  SpreadsheetQuestionRow,
  convertSpreadsheetRowsToQuestions,
  downloadCsvQuestionTemplate,
  downloadExcelQuestionTemplate,
  parseTemplateFileToQuestions,
} from '../utils/excelTemplate';

export interface QuestionBankFileUploadProps {
  onImportQuestions: (items: Partial<Question>[]) => {
    imported: number;
    errors: string[];
    duplicates: number;
    importedIds: string[];
  };
  onNotify?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onOpenAdvancedModal?: () => void;
}

export const QuestionBankFileUpload: React.FC<QuestionBankFileUploadProps> = ({
  onImportQuestions,
  onNotify,
  onOpenAdvancedModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoSaveToDb, setAutoSaveToDb] = useState(true);

  // Default metadata applied to rows that do not specify category/topic/difficulty columns
  const [defaultCategory, setDefaultCategory] = useState('Sains & Teknologi');
  const [defaultTopic, setDefaultTopic] = useState('Evaluasi Terpadu');
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>('sedang');
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // Last uploaded file state & parse report
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFormat, setUploadedFormat] = useState<'xlsx' | 'csv' | null>(null);
  const [parsedRows, setParsedRows] = useState<SpreadsheetQuestionRow[]>([]);
  const [showParsedTable, setShowParsedTable] = useState(false);
  const [parseResult, setParseResult] = useState<{
    imported: number;
    duplicates: number;
    errors: string[];
    totalRows: number;
    savedToDb: boolean;
  } | null>(null);

  const processUploadedFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt');

    if (!isExcel && !isCsv) {
      setParseResult({
        imported: 0,
        duplicates: 0,
        errors: [
          `Format berkas "${file.name}" tidak didukung. Unggah berkas template .xlsx, .xls, atau .csv.`,
        ],
        totalRows: 0,
        savedToDb: false,
      });
      return;
    }

    const defaults = {
      category: defaultCategory.trim() || 'Sains & Teknologi',
      topic: defaultTopic.trim() || 'Evaluasi Terpadu',
      difficulty: defaultDifficulty,
      tags: [
        defaultCategory.trim() || 'Sains & Teknologi',
        defaultTopic.trim() || 'Evaluasi Terpadu',
      ],
      isDraft: saveAsDraft,
    };

    const finalizeParsing = (input: {
      fileName: string;
      arrayBuffer?: ArrayBuffer;
      textContent?: string;
    }) => {
      try {
        const { fileFormat, rows, questions } = parseTemplateFileToQuestions(input, defaults);
        setUploadedFileName(file.name);
        setUploadedFormat(fileFormat);
        setParsedRows(rows);

        if (rows.length === 0) {
          setParseResult({
            imported: 0,
            duplicates: 0,
            errors: [
              `Tidak ditemukan baris soal yang valid di dalam berkas "${file.name}". Pastikan Kolom A (prompt) berisi teks pertanyaan.`,
            ],
            totalRows: 0,
            savedToDb: false,
          });
          return;
        }

        if (autoSaveToDb) {
          const batchRes = onImportQuestions(questions);
          setParseResult({
            imported: batchRes.imported,
            duplicates: batchRes.duplicates,
            errors: batchRes.errors,
            totalRows: rows.length,
            savedToDb: true,
          });
        } else {
          setShowParsedTable(true);
          setParseResult({
            imported: 0,
            duplicates: 0,
            errors: [],
            totalRows: rows.length,
            savedToDb: false,
          });
          onNotify?.(
            'info',
            'Berkas Template Berhasil Diparsing',
            `${rows.length} baris soal siap disimpan ke database Bank Soal.`
          );
        }
      } catch (err: any) {
        setParseResult({
          imported: 0,
          duplicates: 0,
          errors: [
            `Gagal memproses berkas "${file.name}": ${err?.message || 'Struktur berkas tidak valid.'}`,
          ],
          totalRows: 0,
          savedToDb: false,
        });
      }
    };

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          finalizeParsing({ fileName: file.name, arrayBuffer: reader.result });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          finalizeParsing({ fileName: file.name, textContent: reader.result });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleManualCommitPendingRows = () => {
    if (parsedRows.length === 0) return;
    const questions = convertSpreadsheetRowsToQuestions(parsedRows, {
      category: defaultCategory.trim() || 'Sains & Teknologi',
      topic: defaultTopic.trim() || 'Evaluasi Terpadu',
      difficulty: defaultDifficulty,
      tags: [
        defaultCategory.trim() || 'Sains & Teknologi',
        defaultTopic.trim() || 'Evaluasi Terpadu',
      ],
      isDraft: saveAsDraft,
    });
    const batchRes = onImportQuestions(questions);
    setParseResult({
      imported: batchRes.imported,
      duplicates: batchRes.duplicates,
      errors: batchRes.errors,
      totalRows: parsedRows.length,
      savedToDb: true,
    });
  };

  return (
    <section
      data-testid="question-bank-file-upload-card"
      aria-label="Unggah Template CSV atau Excel ke Database Bank Soal"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#4A7C59]" />
            <h2 className="text-sm font-bold text-[#111C2D]">
              Unggah Cepat Template CSV / Excel (.xlsx) ke Database Bank Soal
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Unggah berkas template 9 kolom terpisah (<code className="font-mono-tabular text-[#111C2D]">prompt</code> s.d.{' '}
            <code className="font-mono-tabular text-[#111C2D]">explanation</code>) untuk mem-parsing otomatis setiap baris langsung ke dalam database Bank Soal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              downloadExcelQuestionTemplate(
                DEFAULT_TEMPLATE_ROWS,
                'template-impor-soal-asesmen-askia.xlsx'
              );
              onNotify?.(
                'success',
                'Template Excel (.xlsx) Diunduh',
                'Berkas Excel 9 kolom terpisah siap diisi dan diunggah kembali.'
              );
            }}
            className="px-3 py-1.5 bg-[#EEF4F0] hover:bg-[#E1ECE4] text-[#3D6849] border border-[#4A7C59]/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Unduh Template Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadCsvQuestionTemplate(
                DEFAULT_TEMPLATE_ROWS,
                'template-impor-soal-asesmen-askia.csv'
              );
              onNotify?.(
                'success',
                'Template CSV Diunduh',
                'Berkas CSV dengan pemisah kolom otomatis siap diisi.'
              );
            }}
            className="px-3 py-1.5 bg-[#F8F9F7] hover:bg-slate-100 text-[#111C2D] border border-[#E2E8F0] text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
            <span>Unduh Template CSV (.csv)</span>
          </button>

          {onOpenAdvancedModal && (
            <button
              type="button"
              onClick={onOpenAdvancedModal}
              className="px-3 py-1.5 bg-[#F8F9F7] hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Table className="w-3.5 h-3.5 text-slate-500" />
              <span>Editor Tabel &amp; JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Default Metadata & Auto-Parse Controls + Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Dropzone Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`lg:col-span-7 border-2 border-dashed rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
            isDragging
              ? 'border-[#4A7C59] bg-[#EEF4F0]/70'
              : 'border-[#CBD5E1] bg-[#F8F9F7] hover:border-[#4A7C59]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            data-testid="question-bank-file-input"
            aria-label="Unggah berkas template CSV atau Excel"
            onChange={handleFileInputChange}
            className="sr-only"
          />

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#EEF4F0] border border-[#4A7C59]/25 flex items-center justify-center shrink-0 text-[#4A7C59]">
              <FileUp className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#111C2D]">
                Tarik &amp; Lepaskan Berkas Template (.xlsx, .xls, .csv) di Sini
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Kolom A–I (<span className="font-mono-tabular">prompt</span>,{' '}
                <span className="font-mono-tabular">questionType</span>,{' '}
                <span className="font-mono-tabular">optionA–D</span>,{' '}
                <span className="font-mono-tabular">correctAnswer</span>,{' '}
                <span className="font-mono-tabular">points</span>,{' '}
                <span className="font-mono-tabular">explanation</span>) langsung dipetakan otomatis ke struktur Bank Soal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Pilih File CSV / Excel</span>
          </button>
        </div>

        {/* Default Tag / Category / Difficulty Configuration for Uploaded Rows */}
        <div className="lg:col-span-5 bg-[#F8F9F7] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#111C2D] flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#4A7C59]" />
              <span>Atribut Default Saat Parsing Baris:</span>
            </span>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111C2D] cursor-pointer">
              <input
                type="checkbox"
                checked={autoSaveToDb}
                onChange={(e) => setAutoSaveToDb(e.target.checked)}
                className="rounded border-slate-300 text-[#4A7C59]"
              />
              <span>Otomatis Simpan ke Database</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Kategori Default
              </label>
              <input
                type="text"
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                aria-label="Kategori default impor soal"
                placeholder="Sains & Teknologi"
                className="w-full px-2.5 py-1 text-xs bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#4A7C59]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Tag Topik Default
              </label>
              <input
                type="text"
                value={defaultTopic}
                onChange={(e) => setDefaultTopic(e.target.value)}
                aria-label="Tag topik default impor soal"
                placeholder="Evaluasi Terpadu"
                className="w-full px-2.5 py-1 text-xs bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#4A7C59]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Tingkat Kesulitan
              </label>
              <select
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value as DifficultyLevel)}
                aria-label="Tingkat kesulitan default impor soal"
                className="w-full px-2 py-1 text-xs bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#4A7C59]"
              >
                <option value="mudah">Mudah (C1–C2)</option>
                <option value="sedang">Sedang (C3–C4)</option>
                <option value="sulit">Sulit / HOTS (C5–C6)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-[#E2E8F0]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDraft}
                onChange={(e) => setSaveAsDraft(e.target.checked)}
                className="rounded border-slate-300 text-[#D97706]"
              />
              <span>Impor sebagai Draf (Work-in-Progress)</span>
            </label>
            <span className="font-mono-tabular text-[10px] text-slate-500">
              Format: .xlsx · .xls · .csv
            </span>
          </div>
        </div>
      </div>

      {/* Automatic Parse & Database Import Status Report */}
      {parseResult && (
        <div
          data-testid="file-upload-parse-result"
          className={`p-4 rounded-xl border text-xs space-y-2.5 ${
            parseResult.imported > 0
              ? 'bg-[#EEF4F0]/80 border-[#4A7C59]/40 text-[#111C2D]'
              : parseResult.errors.length > 0
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#111C2D] flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#16A34A]" />
                <span>
                  Hasil Unggah &amp; Parsing Otomatis
                  {uploadedFileName ? ` (${uploadedFileName})` : ''}:
                </span>
              </span>
              <span className="font-mono-tabular font-semibold text-[#16A34A]">
                {parseResult.imported} soal berhasil disimpan ke database
              </span>
              <span>·</span>
              <span className="font-mono-tabular text-slate-600">
                Total baris terbaca: {parseResult.totalRows}
              </span>
              <span>·</span>
              <span className="font-mono-tabular text-slate-600">
                Duplikat dilewati: {parseResult.duplicates}
              </span>
              {uploadedFormat && (
                <>
                  <span>·</span>
                  <span className="font-mono-tabular uppercase text-slate-600">
                    Format {uploadedFormat}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!parseResult.savedToDb && parsedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleManualCommitPendingRows}
                  className="px-3 py-1 bg-[#4A7C59] hover:bg-[#3D6849] text-white font-semibold rounded-md transition-colors"
                >
                  Simpan {parsedRows.length} Baris ke Database Sekarang
                </button>
              )}
              {parsedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowParsedTable((v) => !v)}
                  className="px-2.5 py-1 bg-white border border-[#E2E8F0] text-[#111C2D] font-semibold rounded-md hover:bg-slate-50"
                >
                  {showParsedTable
                    ? 'Sembunyikan Tabel Baris'
                    : `Lihat ${parsedRows.length} Baris Terparsing`}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setParseResult(null);
                  setParsedRows([]);
                  setUploadedFileName(null);
                  setShowParsedTable(false);
                }}
                aria-label="Tutup laporan unggah berkas"
                className="p-1 text-slate-500 hover:text-[#111C2D]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {parseResult.errors.length > 0 && (
            <ul className="list-disc pl-5 text-red-700 space-y-0.5">
              {parseResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          {showParsedTable && parsedRows.length > 0 && (
            <div className="overflow-x-auto bg-white border border-[#E2E8F0] rounded-lg mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9F7] border-b border-[#E2E8F0] text-[#111C2D]">
                    <th className="py-2 px-2.5 font-mono-tabular font-bold border-r border-[#E2E8F0] w-10 text-center">
                      #
                    </th>
                    {SPREADSHEET_COLUMNS.map((col, cIdx) => (
                      <th
                        key={col.key}
                        className="py-2 px-2.5 border-r border-[#E2E8F0] min-w-[115px]"
                      >
                        <div className="text-[10px] font-mono-tabular font-semibold text-[#4A7C59]">
                          Kolom {String.fromCharCode(65 + cIdx)}
                        </div>
                        <div className="font-mono-tabular font-bold text-[#111C2D]">
                          {col.header}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {parsedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 font-mono-tabular text-center text-slate-500 border-r border-[#E2E8F0]">
                        {rIdx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] font-medium text-[#111C2D]">
                        {row.prompt}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] font-mono-tabular text-slate-700">
                        {row.questionType}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] text-slate-600">
                        {row.optionA || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] text-slate-600">
                        {row.optionB || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] text-slate-600">
                        {row.optionC || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] text-slate-600">
                        {row.optionD || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] font-mono-tabular font-bold text-[#4A7C59] text-center">
                        {row.correctAnswer}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-[#E2E8F0] font-mono-tabular text-right">
                        {row.points}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600">{row.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
