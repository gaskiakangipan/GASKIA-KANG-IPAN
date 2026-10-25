import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TEMPLATE_ROWS,
  buildCsvTemplateString,
  buildExcelTemplateBuffer,
  parseDelimitedTextToRows,
  parseExcelBufferToRows,
  parseTemplateFileToQuestions,
} from './excelTemplate';

test('buildExcelTemplateBuffer and parseExcelBufferToRows round-trip 9-column template rows', () => {
  const buffer = buildExcelTemplateBuffer(DEFAULT_TEMPLATE_ROWS);
  const parsed = parseExcelBufferToRows(buffer);
  assert.equal(parsed.length, DEFAULT_TEMPLATE_ROWS.length);
  assert.equal(parsed[0].prompt, DEFAULT_TEMPLATE_ROWS[0].prompt);
  assert.equal(parsed[0].questionType, 'single_choice');
  assert.equal(parsed[0].optionA, 'Oksigen (O2)');
  assert.equal(parsed[0].correctAnswer, 'A');
  assert.equal(parsed[0].points, 10);
});

test('buildCsvTemplateString and parseDelimitedTextToRows parse semicolon and comma CSV templates', () => {
  const csvText = buildCsvTemplateString(DEFAULT_TEMPLATE_ROWS);
  const parsedSemicolon = parseDelimitedTextToRows(csvText);
  assert.equal(parsedSemicolon.length, DEFAULT_TEMPLATE_ROWS.length);
  assert.equal(parsedSemicolon[2].questionType, 'numeric');
  assert.equal(parsedSemicolon[2].correctAnswer, '30');

  const commaCsv = [
    'prompt,questionType,optionA,optionB,optionC,optionD,correctAnswer,points,explanation',
    'Manakah protokol enkripsi web standar?,single_choice,HTTPS (TLS),FTP,Telnet,HTTP,A,15,HTTPS menggunakan TLS untuk enkripsi.',
    'Berapakah jumlah bit pada alamat IPv4?,numeric,,,,,32,10,Alamat IPv4 terdiri atas 32 bit.',
  ].join('\n');

  const parsedComma = parseDelimitedTextToRows(commaCsv);
  assert.equal(parsedComma.length, 2);
  assert.equal(parsedComma[0].prompt, 'Manakah protokol enkripsi web standar?');
  assert.equal(parsedComma[1].questionType, 'numeric');
  assert.equal(parsedComma[1].correctAnswer, '32');
});

test('parseTemplateFileToQuestions converts uploaded CSV and Excel files into Question objects with tags and defaults', () => {
  const csvContent = [
    'prompt;questionType;optionA;optionB;optionC;optionD;correctAnswer;points;explanation',
    'Apa fungsi utama enzim amilase pada sistem pencernaan?;single_choice;Memecah amilum menjadi maltosa;Mengemulsi lemak;Mengaktifkan pepsinogen;Menyerap air;A;10;Amilase menghidrolisis pati menjadi disakarida.',
    'Enzim bekerja secara spesifik mengikuti model kunci dan gembok (lock and key).;true_false;Pernyataan Benar;Pernyataan Salah;;;A;10;Sisi aktif enzim spesifik terhadap substrat.',
  ].join('\n');

  const result = parseTemplateFileToQuestions(
    {
      fileName: 'template-biologi.csv',
      textContent: csvContent,
    },
    {
      category: 'Biologi Molekuler',
      topic: 'Metabolisme & Enzim',
      difficulty: 'sedang',
      tags: ['Biologi Molekuler', 'Metabolisme & Enzim', 'Enzimologi'],
      isDraft: false,
    }
  );

  assert.equal(result.fileFormat, 'csv');
  assert.equal(result.rows.length, 2);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].category, 'Biologi Molekuler');
  assert.equal(result.questions[0].topic, 'Metabolisme & Enzim');
  assert.equal(result.questions[0].difficulty, 'sedang');
  assert.equal(result.questions[0].status, 'published');
  assert.ok(result.questions[0].tags?.includes('Enzimologi'));

  // Test Excel buffer path as well
  const excelBuffer = buildExcelTemplateBuffer(result.rows);
  const excelResult = parseTemplateFileToQuestions(
    {
      fileName: 'template-biologi.xlsx',
      arrayBuffer: excelBuffer,
    },
    {
      category: 'Biologi Molekuler',
      topic: 'Metabolisme & Enzim',
      difficulty: 'sulit',
    }
  );

  assert.equal(excelResult.fileFormat, 'xlsx');
  assert.equal(excelResult.questions.length, 2);
  assert.equal(excelResult.questions[0].difficulty, 'sulit');
});
