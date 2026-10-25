import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {
  buildParticipantJoinUrl,
  buildParticipantShareMessage,
  generateDeterministicQrMatrix,
  normalizePublicShareOrigin,
  parseParticipantJoinParams,
} from './shareAssessmentLink';

test('buildParticipantJoinUrl converts ais-dev origin to public ais-pre origin and constructs single-param /?join= URL', () => {
  const plainUrl = buildParticipantJoinUrl('http://localhost:3000/', 'POST-BIO-26');
  assert.equal(plainUrl, 'http://localhost:3000/?join=POST-BIO-26');

  const devOrigin = 'https://ais-dev-b54gc3xt4oz6xyawwhhvr3-225699165776.asia-northeast1.run.app';
  const expectedPreOrigin = 'https://ais-pre-b54gc3xt4oz6xyawwhhvr3-225699165776.asia-northeast1.run.app';
  assert.equal(normalizePublicShareOrigin(devOrigin), expectedPreOrigin);

  const cloudRunShareUrl = buildParticipantJoinUrl(devOrigin, 'POST-BIO-26', {
    includeToken: true,
    examToken: 'BIO202',
  });
  assert.equal(
    cloudRunShareUrl,
    'https://ais-pre-b54gc3xt4oz6xyawwhhvr3-225699165776.asia-northeast1.run.app/?join=POST-BIO-26'
  );
});

test('parseParticipantJoinParams extracts accessCode and token from root query, path, and hash', () => {
  const fromQuery = parseParticipantJoinParams('?join=POST-BIO-26&token=BIO202', '/');
  assert.equal(fromQuery.accessCode, 'POST-BIO-26');
  assert.equal(fromQuery.token, 'BIO202');

  const fromPath = parseParticipantJoinParams('?token=FIS101', '/join/DIAG-FIS-10');
  assert.equal(fromPath.accessCode, 'DIAG-FIS-10');
  assert.equal(fromPath.token, 'FIS101');

  const fromHash = parseParticipantJoinParams('', '/', '#/join/POST-BIO-26?token=BIO202');
  assert.equal(fromHash.accessCode, 'POST-BIO-26');
  assert.equal(fromHash.token, 'BIO202');
});

test('buildParticipantShareMessage includes activity title, access code, token, and join URL', () => {
  const joinUrl = 'http://localhost:3000/?join=POST-BIO-26&token=BIO202';
  const msg = buildParticipantShareMessage(
    {
      title: 'Posttest Biologi Molekuler Kelas XII',
      accessCode: 'POST-BIO-26',
      durationMinutes: 45,
      passingScore: 75,
      examToken: 'BIO202',
      organizer: 'SMA Negeri 1 Nusantara',
      questionIds: ['q1', 'q2', 'q3'],
    },
    joinUrl,
    {
      customNote: 'Pastikan koneksi stabil sebelum memulai ujian.',
    }
  );

  assert.ok(msg.includes('Posttest Biologi Molekuler Kelas XII'));
  assert.ok(msg.includes('POST-BIO-26'));
  assert.ok(msg.includes('BIO202'));
  assert.ok(msg.includes(joinUrl));
  assert.ok(msg.includes('Pastikan koneksi stabil sebelum memulai ujian.'));
});

test('generateDeterministicQrMatrix generates a genuine ISO/IEC 18004 QR code matrix matching QRCode.create', () => {
  const targetUrl = 'http://localhost:3000/?join=POST-BIO-26&token=BIO202';
  const matrix = generateDeterministicQrMatrix(targetUrl);
  const expectedQr = QRCode.create(targetUrl, { errorCorrectionLevel: 'M' });

  assert.equal(matrix.length, expectedQr.modules.size);
  assert.equal(matrix[0].length, expectedQr.modules.size);
  // Top-left finder pattern checks
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[0][6], true);
  assert.equal(matrix[3][3], true);
  assert.equal(matrix[1][1], false);
  // Exact module match across entire QR matrix
  for (let r = 0; r < expectedQr.modules.size; r++) {
    for (let c = 0; c < expectedQr.modules.size; c++) {
      assert.equal(matrix[r][c], Boolean(expectedQr.modules.data[r * expectedQr.modules.size + c]));
    }
  }
});

