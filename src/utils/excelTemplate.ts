import * as XLSX from 'xlsx';
import { DifficultyLevel, EducationLevel, Question, QuestionType } from '../types/assessment';

export interface SpreadsheetQuestionRow {
  prompt: string;
  questionType: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  points: number;
  explanation: string;
  category?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
}

export const DEFAULT_TEMPLATE_ROWS: SpreadsheetQuestionRow[] = [
  {
    prompt: 'Manakah gas utama yang dihasilkan oleh proses fotosintesis tumbuhan hijau?',
    questionType: 'single_choice',
    optionA: 'Oksigen (O2)',
    optionB: 'Nitrogen (N2)',
    optionC: 'Karbon Monoksida (CO)',
    optionD: 'Hidrogen (H2)',
    correctAnswer: 'A',
    points: 10,
    explanation: 'Fotosintesis melepaskan oksigen (O2) sebagai hasil fotolisis molekul air.',
  },
  {
    prompt: 'Evaluasi Pretest dilaksanakan sebelum materi pelatihan diberikan untuk memetakan kemampuan awal peserta.',
    questionType: 'true_false',
    optionA: 'Pernyataan Benar',
    optionB: 'Pernyataan Salah',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    points: 10,
    explanation: 'Pretest berfungsi mengukur kemampuan awal (baseline) sebelum pembelajaran dimulai.',
  },
  {
    prompt: 'Berapakah nilai selisih (Delta) jika skor Pretest adalah 60 dan skor Posttest adalah 90?',
    questionType: 'numeric',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '30',
    points: 15,
    explanation: 'Selisih nilai (Delta) adalah 90 dikurangi 60 sama dengan 30.',
  },
  {
    prompt: 'Sebutkan istilah indeks peningkatan nilai terstandar antara Pretest dan Posttest (tulis: N-Gain)!',
    questionType: 'short_answer',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'N-Gain',
    points: 10,
    explanation: 'Normalized Gain (N-Gain) mengukur peningkatan pemahaman secara proporsional.',
  },
];

export const SPREADSHEET_COLUMNS: {
  key: keyof SpreadsheetQuestionRow;
  header: string;
  subHeader: string;
  label?: string;
  width: number;
}[] = [
  { key: 'prompt', header: 'prompt', subHeader: 'Pertanyaan / Pokok Soal', label: 'Pertanyaan / Pokok Soal', width: 52 },
  { key: 'questionType', header: 'questionType', subHeader: 'Jenis Soal', label: 'Jenis Soal', width: 18 },
  { key: 'optionA', header: 'optionA', subHeader: 'Pilihan A', label: 'Pilihan A', width: 26 },
  { key: 'optionB', header: 'optionB', subHeader: 'Pilihan B', label: 'Pilihan B', width: 26 },
  { key: 'optionC', header: 'optionC', subHeader: 'Pilihan C', label: 'Pilihan C', width: 26 },
  { key: 'optionD', header: 'optionD', subHeader: 'Pilihan D', label: 'Pilihan D', width: 26 },
  { key: 'correctAnswer', header: 'correctAnswer', subHeader: 'Kunci Jawaban', label: 'Kunci Jawaban', width: 16 },
  { key: 'points', header: 'points', subHeader: 'Bobot Poin', label: 'Bobot Poin', width: 12 },
  { key: 'explanation', header: 'explanation', subHeader: 'Pembahasan Jawaban', label: 'Pembahasan Jawaban', width: 45 },
];

/**
 * Generates an ArrayBuffer for a real multi-column Excel (.xlsx) workbook
 * where each field is placed in its own separate column (Columns A through I).
 */
export function buildExcelTemplateBuffer(
  rows: SpreadsheetQuestionRow[] = DEFAULT_TEMPLATE_ROWS
): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template_Soal (Columns A - I properly separated)
  const sheetData = [
    SPREADSHEET_COLUMNS.map((c) => c.header),
    ...rows.map((r) => [
      r.prompt,
      r.questionType,
      r.optionA,
      r.optionB,
      r.optionC,
      r.optionD,
      r.correctAnswer,
      r.points,
      r.explanation,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = SPREADSHEET_COLUMNS.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Soal');

  // Sheet 2: Panduan_Kolom
  const guideData = [
    ['Nama Kolom', 'Keterangan Pengisian', 'Contoh Nilai Valid'],
    ['prompt', 'Teks pertanyaan atau instruksi butir soal (wajib diisi, min. 5 karakter)', 'Manakah organel penghasil ATP?'],
    ['questionType', 'Kode jenis soal: single_choice | multiple_choice | true_false | short_answer | numeric | essay', 'single_choice'],
    ['optionA', 'Teks opsi jawaban A (atau Pernyataan Benar untuk true_false)', 'Mitokondria'],
    ['optionB', 'Teks opsi jawaban B (atau Pernyataan Salah untuk true_false)', 'Ribosom'],
    ['optionC', 'Teks opsi jawaban C (kosongkan jika tidak digunakan)', 'Lisosom'],
    ['optionD', 'Teks opsi jawaban D (kosongkan jika tidak digunakan)', 'Badan Golgi'],
    ['correctAnswer', 'Huruf kunci (A/B/C/D), angka untuk numeric, atau teks untuk short_answer', 'A'],
    ['points', 'Bobot nilai soal berupa angka bulat positif', '10'],
    ['explanation', 'Penjelasan atau pembahasan kunci jawaban', 'Mitokondria adalah tempat respirasi seluler.'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 68 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Kolom');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return out;
}

/**
 * Triggers browser download of the multi-column .xlsx template.
 */
export function downloadExcelQuestionTemplate(
  rows: SpreadsheetQuestionRow[] = DEFAULT_TEMPLATE_ROWS,
  filename = 'template-impor-soal-asesmen-askia.xlsx'
): void {
  const buffer = buildExcelTemplateBuffer(rows);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates CSV string content for the template.
 */
export function buildCsvTemplateString(
  rows: SpreadsheetQuestionRow[] = DEFAULT_TEMPLATE_ROWS
): string {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = SPREADSHEET_COLUMNS.map((c) => c.header).join(';');
  const dataLines = rows.map((r) =>
    [
      r.prompt,
      r.questionType,
      r.optionA,
      r.optionB,
      r.optionC,
      r.optionD,
      r.correctAnswer,
      r.points,
      r.explanation,
    ]
      .map(escapeCell)
      .join(';')
  );

  return '\uFEFFsep=;\r\n' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Triggers browser download of an Excel-compatible CSV file using semicolon (;) delimiter
 * and explicit `sep=;` directive so Excel on Indonesian/European locale splits columns automatically.
 */
export function downloadCsvQuestionTemplate(
  rows: SpreadsheetQuestionRow[] = DEFAULT_TEMPLATE_ROWS,
  filename = 'template-impor-soal-asesmen-askia.csv'
): void {
  const content = buildCsvTemplateString(rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses an ArrayBuffer from an uploaded .xlsx, .xls, or .csv file into SpreadsheetQuestionRow[].
 */
export function parseExcelBufferToRows(buffer: ArrayBuffer): SpreadsheetQuestionRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  return normalizeRawGridToQuestionRows(rawRows);
}

/**
 * Parses delimited text (CSV with comma, semicolon, or tab from Excel copy-paste)
 * into SpreadsheetQuestionRow[].
 */
export function parseDelimitedTextToRows(text: string): SpreadsheetQuestionRow[] {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/^sep=.\r?\n/i, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // Auto-detect delimiter from first line: tab (\t), semicolon (;), or comma (,)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.split(';').length > firstLine.split(',').length
    ? ';'
    : ',';

  const rawGrid = lines.map((line) => splitCsvLine(line, delimiter));
  return normalizeRawGridToQuestionRows(rawGrid);
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const VALID_QUESTION_TYPES: QuestionType[] = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_answer',
  'numeric',
  'matching',
  'ordering',
  'essay',
  'image_question',
  'stimulus_case',
];

function normalizeQuestionType(raw: string): QuestionType {
  const cleaned = (raw || '').trim().toLowerCase() as QuestionType;
  if (VALID_QUESTION_TYPES.includes(cleaned)) return cleaned;
  return 'single_choice';
}

function normalizeDifficulty(raw?: string): DifficultyLevel | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'mudah' || cleaned === 'easy') return 'mudah';
  if (cleaned === 'sedang' || cleaned === 'medium') return 'sedang';
  if (cleaned === 'sulit' || cleaned === 'hard' || cleaned === 'hots') return 'sulit';
  return undefined;
}

function normalizeRawGridToQuestionRows(rawGrid: any[][]): SpreadsheetQuestionRow[] {
  if (!rawGrid || rawGrid.length === 0) return [];

  const rows: SpreadsheetQuestionRow[] = [];
  rawGrid.forEach((cols, idx) => {
    if (!Array.isArray(cols) || cols.length === 0) return;
    const firstCell = String(cols[0] ?? '').trim();
    if (!firstCell) return;
    // Skip header row
    if (
      idx === 0 &&
      (firstCell.toLowerCase() === 'prompt' ||
        firstCell.toLowerCase().includes('pertanyaan'))
    ) {
      return;
    }

    // If a user uploaded a CSV where the entire row was accidentally in cell 0 with commas or semicolons
    const effectiveCols =
      cols.length === 1 && (firstCell.includes(';') || firstCell.includes(','))
        ? splitCsvLine(firstCell, firstCell.includes(';') ? ';' : ',')
        : cols.map((c) => String(c ?? '').trim());

    if (effectiveCols.length >= 7) {
      const optCategory = effectiveCols[9] ? effectiveCols[9].trim() : undefined;
      const optTopic = effectiveCols[10] ? effectiveCols[10].trim() : undefined;
      const optDifficulty = normalizeDifficulty(effectiveCols[11]);
      const optTags = effectiveCols[12]
        ? effectiveCols[12]
            .split(/[|,]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      rows.push({
        prompt: effectiveCols[0] || '',
        questionType: normalizeQuestionType(effectiveCols[1]),
        optionA: effectiveCols[2] || '',
        optionB: effectiveCols[3] || '',
        optionC: effectiveCols[4] || '',
        optionD: effectiveCols[5] || '',
        correctAnswer: effectiveCols[6] || 'A',
        points: Number(effectiveCols[7] || 10) || 10,
        explanation: effectiveCols[8] || 'Pembahasan dari impor spreadsheet.',
        category: optCategory,
        topic: optTopic,
        difficulty: optDifficulty,
        tags: optTags,
      });
    } else {
      // Compact 5-column fallback: prompt, questionType, category, difficulty, points
      rows.push({
        prompt: effectiveCols[0] || '',
        questionType: normalizeQuestionType(effectiveCols[1]),
        optionA: 'Pilihan A (Benar)',
        optionB: 'Pilihan B',
        optionC: 'Pilihan C',
        optionD: 'Pilihan D',
        correctAnswer: 'A',
        points: Number(effectiveCols[4] || 10) || 10,
        explanation: 'Pembahasan soal dari impor.',
        category: effectiveCols[2] || undefined,
        difficulty: normalizeDifficulty(effectiveCols[3]),
      });
    }
  });

  return rows;
}

export interface SpreadsheetImportDefaults {
  category?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
  educationLevel?: EducationLevel;
  tags?: string[];
  isDraft?: boolean;
}

/**
 * Converts SpreadsheetQuestionRow[] into Partial<Question>[] ready for importQuestionsBatch.
 */
export function convertSpreadsheetRowsToQuestions(
  rows: SpreadsheetQuestionRow[],
  defaults?: SpreadsheetImportDefaults
): Partial<Question>[] {
  const baseTs = Date.now();
  return rows.map((r, idx) => {
    const qType: QuestionType = normalizeQuestionType(r.questionType);
    const baseId = `xls-${baseTs}-${idx}`;
    const ansKey = (r.correctAnswer || 'A').trim().toUpperCase();
    const pts = Number(r.points) > 0 ? Number(r.points) : 10;

    const resolvedCategory = r.category || defaults?.category || 'Sains & Teknologi';
    const resolvedTopic = r.topic || defaults?.topic || 'Evaluasi Terpadu';
    const resolvedDifficulty: DifficultyLevel =
      r.difficulty || defaults?.difficulty || (qType === 'essay' ? 'sulit' : 'sedang');
    const resolvedEducation: EducationLevel = defaults?.educationLevel || 'SMA/SMK/MA';
    const isDraft = Boolean(defaults?.isDraft);
    const status = isDraft ? 'draft' : 'published';

    const tagSet = new Set<string>();
    if (resolvedCategory) tagSet.add(resolvedCategory);
    if (resolvedTopic) tagSet.add(resolvedTopic);
    (defaults?.tags || []).forEach((t) => {
      if (t && t.trim()) tagSet.add(t.trim());
    });
    (r.tags || []).forEach((t) => {
      if (t && t.trim()) tagSet.add(t.trim());
    });
    const resolvedTags = Array.from(tagSet);

    if (qType === 'numeric') {
      return {
        prompt: r.prompt,
        questionType: 'numeric',
        correctNumericValue: Number(r.correctAnswer || 0),
        numericTolerance: 0.05,
        points: pts,
        category: resolvedCategory,
        topic: resolvedTopic,
        tags: resolvedTags,
        difficulty: resolvedDifficulty,
        educationLevel: resolvedEducation,
        status,
        isDraft,
        explanation: r.explanation || 'Pembahasan soal numerik.',
      };
    }

    if (qType === 'short_answer') {
      return {
        prompt: r.prompt,
        questionType: 'short_answer',
        correctShortAnswers: [r.correctAnswer.trim() || 'Jawaban'],
        points: pts,
        category: resolvedCategory,
        topic: resolvedTopic,
        tags: resolvedTags,
        difficulty: resolvedDifficulty,
        educationLevel: resolvedEducation,
        status,
        isDraft,
        explanation: r.explanation || 'Pembahasan soal isian singkat.',
      };
    }

    if (qType === 'essay') {
      return {
        prompt: r.prompt,
        questionType: 'essay',
        rubric: [
          {
            id: `${baseId}-rub`,
            criterion: 'Ketepatan Konsep & Kelengkapan Argumen',
            maxPoints: pts,
            description: r.explanation || 'Penilaian manual berdasarkan rubrik esai.',
          },
        ],
        points: pts,
        category: resolvedCategory,
        topic: resolvedTopic,
        tags: resolvedTags,
        difficulty: resolvedDifficulty,
        educationLevel: resolvedEducation,
        status,
        isDraft,
        explanation: r.explanation || 'Dinilai secara manual oleh instruktur.',
      };
    }

    const options =
      qType === 'true_false'
        ? [
            { id: `${baseId}-a`, label: 'Benar', text: r.optionA || 'Pernyataan Benar' },
            { id: `${baseId}-b`, label: 'Salah', text: r.optionB || 'Pernyataan Salah' },
          ]
        : [
            { id: `${baseId}-a`, label: 'A', text: r.optionA || 'Pilihan A' },
            { id: `${baseId}-b`, label: 'B', text: r.optionB || 'Pilihan B' },
            { id: `${baseId}-c`, label: 'C', text: r.optionC || 'Pilihan C' },
            { id: `${baseId}-d`, label: 'D', text: r.optionD || 'Pilihan D' },
          ];

    const keyMap: Record<string, string> = {
      A: `${baseId}-a`,
      BENAR: `${baseId}-a`,
      TRUE: `${baseId}-a`,
      B: `${baseId}-b`,
      SALAH: `${baseId}-b`,
      FALSE: `${baseId}-b`,
      C: `${baseId}-c`,
      D: `${baseId}-d`,
    };

    const resolvedCorrectIds =
      qType === 'multiple_choice' && ansKey.includes(',')
        ? ansKey
            .split(',')
            .map((k) => keyMap[k.trim()] || '')
            .filter(Boolean)
        : [keyMap[ansKey] || `${baseId}-a`];

    return {
      prompt: r.prompt,
      questionType: qType,
      options,
      correctOptionIds: resolvedCorrectIds.length > 0 ? resolvedCorrectIds : [`${baseId}-a`],
      points: pts,
      category: resolvedCategory,
      topic: resolvedTopic,
      tags: resolvedTags,
      difficulty: resolvedDifficulty,
      educationLevel: resolvedEducation,
      status,
      isDraft,
      explanation: r.explanation || 'Pembahasan butir soal.',
    };
  });
}

/**
 * Pure helper that parses an uploaded template file (.xlsx, .xls, or .csv)
 * into SpreadsheetQuestionRow[] and Partial<Question>[] ready for database insertion.
 */
export function parseTemplateFileToQuestions(
  input: {
    fileName: string;
    arrayBuffer?: ArrayBuffer;
    textContent?: string;
  },
  defaults?: SpreadsheetImportDefaults
): {
  fileFormat: 'xlsx' | 'csv';
  rows: SpreadsheetQuestionRow[];
  questions: Partial<Question>[];
} {
  const lower = (input.fileName || '').toLowerCase();
  const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');

  const rows = isExcel && input.arrayBuffer
    ? parseExcelBufferToRows(input.arrayBuffer)
    : typeof input.textContent === 'string'
    ? parseDelimitedTextToRows(input.textContent)
    : input.arrayBuffer
    ? parseExcelBufferToRows(input.arrayBuffer)
    : [];

  const questions = convertSpreadsheetRowsToQuestions(rows, defaults);
  return {
    fileFormat: isExcel ? 'xlsx' : 'csv',
    rows,
    questions,
  };
}

