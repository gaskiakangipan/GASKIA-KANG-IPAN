import QRCode from 'qrcode';
import { Assessment } from '../types/assessment';

export interface BuildJoinUrlOptions {
  includeToken?: boolean;
  examToken?: string;
}

/**
 * Converts AI Studio private developer preview origins (https://ais-dev-*)
 * to the public Shared App URL origin (https://ais-pre-*) so participants
 * scanning the QR code on mobile phones or opening the link in external
 * browser sessions never hit the developer-only auth wall ("Page not found").
 */
export function normalizePublicShareOrigin(origin: string): string {
  const cleanOrigin = (origin || '').trim().replace(/\/+$/, '');
  return cleanOrigin.replace(/^(https?:\/\/)ais-dev-/i, '$1ais-pre-');
}

/**
 * Builds the direct participant assessment join URL using the public shared origin
 * and a single root query parameter (/?join=:accessCode) with zero '&' characters.
 * Using a single query parameter ensures deterministic URL encoding across the
 * Cloud Run / AI Studio auth bridge proxy and prevents HTTP 404 "Page not found".
 */
export function buildParticipantJoinUrl(
  origin: string,
  accessCode: string,
  _options?: BuildJoinUrlOptions
): string {
  const cleanOrigin = normalizePublicShareOrigin(origin);
  const cleanCode = (accessCode || '').trim();

  if (!cleanCode) {
    return `${cleanOrigin}/`;
  }

  return `${cleanOrigin}/?join=${encodeURIComponent(cleanCode)}`;
}

export interface ParsedJoinParams {
  accessCode: string | null;
  token: string | null;
}

/**
 * Extracts participant join access code and token from query string (?join=...),
 * pathname (/join/:code), or hash (#/join/:code).
 */
export function parseParticipantJoinParams(
  search: string,
  pathname: string = '/',
  hash: string = ''
): ParsedJoinParams {
  const searchParams = new URLSearchParams(search || '');
  let rawJoin =
    searchParams.get('join')?.trim() ||
    searchParams.get('code')?.trim() ||
    null;
  let accessCode: string | null = null;
  let token = searchParams.get('token')?.trim() || null;

  if (rawJoin) {
    if (rawJoin.includes(':')) {
      const [codePart, tokenPart] = rawJoin.split(':');
      accessCode = codePart?.trim() || null;
      if (!token && tokenPart?.trim()) {
        token = tokenPart.trim();
      }
    } else {
      accessCode = rawJoin;
    }
  }

  if (!accessCode && pathname.startsWith('/join/')) {
    const parts = pathname.slice('/join/'.length).split('/').filter(Boolean);
    if (parts[0]) {
      accessCode = decodeURIComponent(parts[0]).trim();
    }
    if (!token && parts[1]) {
      token = decodeURIComponent(parts[1]).trim();
    }
  }

  if (!accessCode && hash) {
    const cleanHash = hash.replace(/^#\/?/, '');
    const [hashPath, hashQuery] = cleanHash.split('?');
    if (hashPath && hashPath.startsWith('join/')) {
      const parts = hashPath.slice('join/'.length).split('/').filter(Boolean);
      if (parts[0]) {
        accessCode = decodeURIComponent(parts[0]).trim();
      }
      if (!token && parts[1]) {
        token = decodeURIComponent(parts[1]).trim();
      }
    } else if (hashPath && (hashPath.startsWith('join=') || hashPath.startsWith('code='))) {
      const hParams = new URLSearchParams(hashPath);
      accessCode = hParams.get('join')?.trim() || hParams.get('code')?.trim() || null;
      if (!token) {
        token = hParams.get('token')?.trim() || null;
      }
    }
    if (hashQuery) {
      const hParams = new URLSearchParams(hashQuery);
      if (!accessCode) {
        accessCode = hParams.get('join')?.trim() || hParams.get('code')?.trim() || null;
      }
      if (!token) {
        token = hParams.get('token')?.trim() || null;
      }
    }
  }

  return {
    accessCode: accessCode || null,
    token: token || null,
  };
}

export interface ShareMessageOptions {
  customNote?: string;
  includeTokenInText?: boolean;
}

/**
 * Generates a formatted Indonesian invitation message for participants
 * suitable for sharing via WhatsApp, Telegram, Email, or LMS announcement.
 */
export function buildParticipantShareMessage(
  assessment: Pick<
    Assessment,
    | 'title'
    | 'accessCode'
    | 'durationMinutes'
    | 'passingScore'
    | 'examToken'
    | 'organizer'
    | 'questionIds'
  >,
  joinUrl: string,
  options?: ShareMessageOptions
): string {
  const tokenText = assessment.examToken?.trim() || 'BIO202';
  const showToken = options?.includeTokenInText ?? true;
  const lines: string[] = [
    `UNDANGAN PELAKSANAAN ASESMEN — ASESMEN-ASKIA`,
    `Kegiatan: ${assessment.title}`,
    `Penyelenggara: ${assessment.organizer}`,
    `Durasi & Soal: ${assessment.durationMinutes} Menit · ${assessment.questionIds.length} Butir Soal (KKM: ${assessment.passingScore}/100)`,
    ``,
    `Tautan Pengerjaan Peserta:`,
    `${joinUrl}`,
    ``,
    `Kode Akses Kegiatan: ${assessment.accessCode}`,
  ];

  if (showToken) {
    lines.push(`Token Sesi Ujian: ${tokenText}`);
  }

  if (options?.customNote && options.customNote.trim()) {
    lines.push(``, `Catatan Instruktur: ${options.customNote.trim()}`);
  }

  lines.push(
    ``,
    `Silakan buka tautan di atas atau pindai kode QR untuk memulai pengerjaan asesmen tepat waktu.`
  );

  return lines.join('\n');
}

/**
 * Generates a real, ISO/IEC 18004 standard-compliant QR code boolean matrix
 * using Reed-Solomon error correction (Level M) so any smartphone camera or
 * QR scanner decodes the participant join URL accurately.
 */
export function generateDeterministicQrMatrix(text: string): boolean[][] {
  const payload = (text || '').trim() || 'https://localhost:3000';
  const qr = QRCode.create(payload, {
    errorCorrectionLevel: 'M',
  });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const grid: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(data[r * size + c]));
    }
    grid.push(row);
  }

  return grid;
}

