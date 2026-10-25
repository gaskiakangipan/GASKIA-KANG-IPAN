import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Maximize2,
  QrCode,
  X,
} from 'lucide-react';
import { Assessment } from '../types/assessment';
import {
  buildParticipantJoinUrl,
  generateDeterministicQrMatrix,
} from '../utils/shareAssessmentLink';

export interface AssessmentShareLinkCardProps {
  assessment: Assessment;
  totalParticipants?: number;
  onNotify?: (
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message?: string
  ) => void;
  externalModalOpen?: boolean;
  onCloseExternalModal?: () => void;
}

interface ScannableQrSvgProps {
  matrix: boolean[][];
  url: string;
  className?: string;
  testId?: string;
}

const ScannableQrSvg: React.FC<ScannableQrSvgProps> = ({
  matrix,
  url,
  className = 'w-44 h-44',
  testId,
}) => {
  const size = matrix.length || 29;
  const quietZone = 4;
  const totalSize = size + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      data-testid={testId}
      aria-label={`Kode QR standar ISO untuk tautan ${url}`}
    >
      <rect width={totalSize} height={totalSize} fill="#FFFFFF" />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill="#000000"
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const AssessmentShareLinkCard: React.FC<AssessmentShareLinkCardProps> = ({
  assessment,
  onNotify,
  externalModalOpen = false,
  onCloseExternalModal,
}) => {
  const [copiedTarget, setCopiedTarget] = useState<'url' | 'code' | 'token' | null>(null);
  const [projectorOpen, setProjectorOpen] = useState<boolean>(false);

  const isModalOpen = projectorOpen || externalModalOpen;

  const examTokenValue = assessment.examToken?.trim() || 'BIO202';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000';

  const shareUrl = useMemo(() => {
    return buildParticipantJoinUrl(origin, assessment.accessCode, {
      includeToken: true,
      examToken: examTokenValue,
    });
  }, [origin, assessment.accessCode, examTokenValue]);

  const qrMatrix = useMemo(() => {
    return generateDeterministicQrMatrix(shareUrl);
  }, [shareUrl]);

  const triggerCopy = (
    text: string,
    target: 'url' | 'code' | 'token',
    toastTitle: string,
    toastDesc: string
  ) => {
    try {
      navigator.clipboard?.writeText(text).catch(() => {});
    } catch {
      // Clipboard fallback handled via state feedback
    }
    setCopiedTarget(target);
    onNotify?.('success', toastTitle, toastDesc);
    setTimeout(() => {
      setCopiedTarget((prev) => (prev === target ? null : prev));
    }, 3500);
  };

  const handleDownloadQrSvg = () => {
    const size = qrMatrix.length || 29;
    const quietZone = 4;
    const totalSize = size + quietZone * 2;
    const rects: string[] = [];
    qrMatrix.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (cell) {
          rects.push(
            `<rect x="${cIdx + quietZone}" y="${rIdx + quietZone}" width="1" height="1" fill="#000000" />`
          );
        }
      });
    });
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="512" height="512" shape-rendering="crispEdges"><rect width="${totalSize}" height="${totalSize}" fill="#FFFFFF" />${rects.join('')}</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-Asesmen-${assessment.accessCode}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify?.(
      'success',
      'Kode QR Berhasil Diunduh',
      `File QR-Asesmen-${assessment.accessCode}.svg berhasil disimpan.`
    );
  };

  const closeProjectorModal = () => {
    setProjectorOpen(false);
    onCloseExternalModal?.();
  };

  return (
    <>
      <section
        data-testid="command-center-share-link-panel"
        aria-label="Bagikan Tautan Asesmen Peserta"
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#4A7C59]" />
              <h2 className="text-sm font-bold text-[#111C2D]">
                Akses Peserta &amp; Layar Proyektor Kelas
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Kode Akses Kegiatan:{' '}
              <strong
                data-testid="share-access-code-value"
                className="font-mono-tabular text-[#111C2D]"
              >
                {assessment.accessCode}
              </strong>{' '}
              · Token Sesi Ujian:{' '}
              <strong
                data-testid="share-exam-token-value"
                className="font-mono-tabular text-[#4A7C59]"
              >
                {examTokenValue}
              </strong>
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setProjectorOpen(true)}
              data-testid="open-projector-share-btn"
              className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Tampilkan QR &amp; Layar Proyektor</span>
            </button>
          </div>
        </div>
      </section>

      {/* Classroom Projector & QR Code Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Layar Proyektor dan QR Akses Asesmen Peserta"
            data-testid="projector-share-modal"
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="text-xs font-semibold text-[#4A7C59] flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Tampilan Layar Proyektor Kelas &amp; QR Akses Peserta</span>
                </div>
                <h3 className="text-xl font-bold text-[#111C2D] mt-0.5">
                  {assessment.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Penyelenggara: {assessment.organizer} · Durasi: {assessment.durationMinutes} Menit · {assessment.questionIds.length} Butir Soal
                </p>
              </div>
              <button
                type="button"
                onClick={closeProjectorModal}
                aria-label="Tutup layar proyektor"
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-[#F8F9F7] hover:bg-slate-100 border border-[#E2E8F0] rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* SVG QR Code Box */}
              <div className="md:col-span-5 flex flex-col items-center justify-center bg-[#F8F9F7] border border-[#E2E8F0] rounded-xl p-5 space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
                  <ScannableQrSvg
                    matrix={qrMatrix}
                    url={shareUrl}
                    className="w-48 h-48"
                    testId="projector-scannable-qr-svg"
                  />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-xs font-bold text-[#111C2D]">
                    Pindai untuk Membuka Halaman Ujian
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Kode QR Standar ISO ({assessment.accessCode})
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadQrSvg}
                    data-testid="download-qr-svg-btn"
                    className="mt-1 px-3 py-1 bg-white hover:bg-slate-50 text-[#111C2D] border border-[#E2E8F0] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
                    <span>Unduh Gambar QR (SVG)</span>
                  </button>
                </div>
              </div>

              {/* Large Access Code, Token, and Direct URL for Classroom Display */}
              <div className="md:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Kode Akses Kegiatan
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          triggerCopy(
                            assessment.accessCode,
                            'code',
                            'Kode Akses Disalin',
                            `Kode akses ${assessment.accessCode} berhasil disalin.`
                          )
                        }
                        aria-label="Salin kode akses kegiatan"
                        className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-slate-50 text-[#111C2D] border border-[#E2E8F0] rounded-md flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedTarget === 'code' ? (
                          <>
                            <Check className="w-3 h-3 text-[#16A34A]" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xl font-mono-tabular font-bold text-[#111C2D] tracking-tight whitespace-nowrap">
                      {assessment.accessCode}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#EEF4F0] border border-[#4A7C59]/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#3D6849] flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-[#4A7C59]" />
                        <span>Token Sesi Ujian</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          triggerCopy(
                            examTokenValue,
                            'token',
                            'Token Ujian Disalin',
                            `Token ujian ${examTokenValue} berhasil disalin.`
                          )
                        }
                        aria-label="Salin token sesi ujian"
                        className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-slate-50 text-[#111C2D] border border-[#E2E8F0] rounded-md flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedTarget === 'token' ? (
                          <>
                            <Check className="w-3 h-3 text-[#16A34A]" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xl font-mono-tabular font-bold text-[#4A7C59] tracking-tight whitespace-nowrap">
                      {examTokenValue}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E8F0] space-y-2">
                  <div className="text-xs font-semibold text-slate-500">
                    Tautan Pengerjaan Peserta (Otomatis dari QR):
                  </div>
                  <Link
                    to={`/?join=${encodeURIComponent(assessment.accessCode)}`}
                    onClick={closeProjectorModal}
                    data-testid="projector-direct-join-link"
                    title="Klik untuk membuka halaman pengerjaan peserta"
                    className="block text-sm font-mono-tabular font-bold text-[#4A7C59] hover:underline break-all bg-white p-3 rounded-lg border border-[#E2E8F0] cursor-pointer"
                  >
                    {shareUrl}
                  </Link>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="copy-assessment-link-btn"
                      onClick={() =>
                        triggerCopy(
                          shareUrl,
                          'url',
                          'Tautan Asesmen Peserta Disalin',
                          `Tautan ${shareUrl} berhasil disalin.`
                        )
                      }
                      className="px-3.5 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedTarget === 'url' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tautan Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Tautan Peserta</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

