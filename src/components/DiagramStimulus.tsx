import React from 'react';

export const DiagramStimulus: React.FC<{
  type?: 'cell_biology' | 'network_topology' | 'physics_circuit' | 'data_chart';
}> = ({ type = 'cell_biology' }) => {
  if (type === 'network_topology') {
    return (
      <div className="my-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9F7] p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Diagram Arsitektur Keamanan Jaringan Zero-Trust SPBE</span>
          <span className="font-mono-tabular">Skala Skematik 1:1</span>
        </div>
        <svg
          viewBox="0 0 680 200"
          className="w-full h-auto max-h-52 rounded-lg bg-white border border-slate-200 p-3"
          role="img"
          aria-label="Diagram Topologi Jaringan Zero Trust dengan komponen berlabel X"
        >
          {/* Client node */}
          <rect x="24" y="65" width="130" height="70" rx="8" fill="#F1F5F9" stroke="#475569" strokeWidth="1.5" />
          <text x="89" y="96" textAnchor="middle" fill="#111C2D" fontSize="12" fontWeight="600">Klien Eksternal</text>
          <text x="89" y="114" textAnchor="middle" fill="#64748B" fontSize="10">HTTPS / TLS 1.3</text>

          {/* Arrow 1 */}
          <line x1="154" y1="100" x2="245" y2="100" stroke="#4A7C59" strokeWidth="2" strokeDasharray="4 2" />
          <polygon points="245,95 255,100 245,105" fill="#4A7C59" />

          {/* Gateway [X] */}
          <rect x="255" y="45" width="170" height="110" rx="10" fill="#EEF4F0" stroke="#4A7C59" strokeWidth="2.5" />
          <text x="340" y="78" textAnchor="middle" fill="#4A7C59" fontSize="14" fontWeight="700">Komponen [X]</text>
          <text x="340" y="98" textAnchor="middle" fill="#111C2D" fontSize="11" fontWeight="500">Verifikasi Token JWT</text>
          <text x="340" y="115" textAnchor="middle" fill="#475569" fontSize="10">&amp; Otorisasi Kebijakan RBAC</text>
          <text x="340" y="135" textAnchor="middle" fill="#4A7C59" fontSize="10" fontWeight="600">Zero-Trust Boundary</text>

          {/* Arrow 2 */}
          <line x1="425" y1="75" x2="515" y2="60" stroke="#111C2D" strokeWidth="1.5" />
          <line x1="425" y1="125" x2="515" y2="140" stroke="#111C2D" strokeWidth="1.5" />

          {/* Internal Services */}
          <rect x="515" y="30" width="140" height="55" rx="8" fill="#F8FAFC" stroke="#334155" strokeWidth="1.5" />
          <text x="585" y="55" textAnchor="middle" fill="#111C2D" fontSize="11" fontWeight="600">Layanan Asesmen</text>
          <text x="585" y="71" textAnchor="middle" fill="#64748B" fontSize="10">Port Internal Terisolasi</text>

          <rect x="515" y="115" width="140" height="55" rx="8" fill="#F8FAFC" stroke="#334155" strokeWidth="1.5" />
          <text x="585" y="140" textAnchor="middle" fill="#111C2D" fontSize="11" fontWeight="600">Basis Data RLS</text>
          <text x="585" y="156" textAnchor="middle" fill="#64748B" fontSize="10">Enkripsi AES-256</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9F7] p-5">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Diagram Ultrastruktur Sel Eukariotik &amp; Organel Bermembran Ganda</span>
        <span className="font-mono-tabular">Perbesaran Skematik 12.000x</span>
      </div>
      <svg
        viewBox="0 0 680 220"
        className="w-full h-auto max-h-56 rounded-lg bg-white border border-slate-200 p-3"
        role="img"
        aria-label="Diagram struktur sel eukariotik dengan organel mitokondria berlabel X"
      >
        {/* Outer cell membrane */}
        <ellipse cx="260" cy="110" rx="220" ry="90" fill="#F8F9F7" stroke="#4A7C59" strokeWidth="2.5" />
        {/* Nucleus */}
        <circle cx="165" cy="110" r="46" fill="#E2E8F0" stroke="#111C2D" strokeWidth="2" />
        <circle cx="165" cy="110" r="16" fill="#94A3B8" />
        <text x="165" y="172" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">Nukleus (Inti Sel)</text>

        {/* Mitochondria [X] */}
        <g transform="translate(290, 68)">
          <ellipse cx="65" cy="36" rx="58" ry="28" fill="#EEF4F0" stroke="#4A7C59" strokeWidth="2.5" />
          <path
            d="M 20 36 C 32 16, 40 56, 52 36 C 64 16, 72 56, 84 36 C 96 16, 102 52, 110 36"
            fill="none"
            stroke="#4A7C59"
            strokeWidth="2"
          />
        </g>

        {/* Callout line to [X] */}
        <line x1="413" y1="104" x2="495" y2="75" stroke="#DC2626" strokeWidth="2" />
        <circle cx="413" cy="104" r="4" fill="#DC2626" />
        <rect x="495" y="45" width="160" height="64" rx="8" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" />
        <text x="575" y="68" textAnchor="middle" fill="#B45309" fontSize="13" fontWeight="700">Organel [X]</text>
        <text x="575" y="85" textAnchor="middle" fill="#111C2D" fontSize="10">Membran Ganda &amp; Krista</text>
        <text x="575" y="99" textAnchor="middle" fill="#64748B" fontSize="10">Matriks Internal</text>
      </svg>
    </div>
  );
};

export const UserAvatar: React.FC<{
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ name, avatarUrl, size = 'md' }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto profil ${name}`}
        referrerPolicy="no-referrer"
        className={`${sizeClasses} rounded-full object-cover border border-[#E2E8F0] shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#4A7C59] text-white font-semibold flex items-center justify-center shrink-0 select-none`}
      aria-label={`Avatar ${name}`}
    >
      {initials || 'AS'}
    </div>
  );
};
