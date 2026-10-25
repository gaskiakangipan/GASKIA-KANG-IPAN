import React, { useRef, useState } from 'react';
import {
  Building2,
  Camera,
  Check,
  FolderPlus,
  KeyRound,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EducationLevel, UserRole } from '../types/assessment';
import { UserAvatar } from '../components/DiagramStimulus';
import { ROLE_LABELS } from '../components/AppShell';

export const ParticipantsPage: React.FC = () => {
  const { currentUser, users, groups, attempts, addParticipantUser } = useApp();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [participantCode, setParticipantCode] = useState(
    `PST-2026-${Math.floor(100 + Math.random() * 899)}`
  );
  const [groupId, setGroupId] = useState(groups[0]?.id || '');

  const participants = users.filter((u) => {
    if (u.role !== 'participant') return false;
    if (
      currentUser.role !== 'superadmin' &&
      u.organizationId !== currentUser.organizationId
    ) {
      return false;
    }
    if (groupFilter !== 'all' && !u.groupIds.includes(groupFilter)) return false;
    if (
      search.trim() &&
      !u.fullName.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase()) &&
      !(u.participantCode || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    addParticipantUser({
      fullName: fullName.trim(),
      email: email.trim(),
      participantCode: participantCode.trim().toUpperCase(),
      groupId,
      organizationId: currentUser.organizationId,
    });
    setFullName('');
    setEmail('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span> Peserta Asesmen
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">Manajemen Peserta Ujian</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Kelola data identitas unik peserta untuk pemasangan hasil Pretest dan Posttest yang akurat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Peserta Baru</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau kode peserta..."
            aria-label="Cari peserta"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          />
        </div>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          aria-label="Filter kelompok peserta"
          className="px-3 py-1.5 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
        >
          <option value="all">Semua Kelompok / Kelas</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                <th className="py-3 px-4 font-semibold">Nama Peserta</th>
                <th className="py-3 px-4 font-semibold">Kode Identitas</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Kelompok / Kelas</th>
                <th className="py-3 px-4 font-semibold text-right">Ujian Diikuti</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {participants.map((p) => {
                const userAttempts = attempts.filter((a) => a.participantId === p.uid);
                const userGroups = groups
                  .filter((g) => p.groupIds.includes(g.id))
                  .map((g) => g.name)
                  .join(', ');

                return (
                  <tr key={p.uid} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-semibold text-[#111C2D]">
                      {p.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-xs font-semibold text-[#4A7C59]">
                      {p.participantCode || p.uid}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{p.email}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {userGroups || 'Umum'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-xs font-bold">
                      {userAttempts.length} Sesi
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#16A34A]">
                      Terverifikasi
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Participant Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[#111C2D]">Daftarkan Peserta Baru</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label htmlFor="part-name" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Nama Lengkap Peserta *
                </label>
                <input
                  id="part-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="part-email" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Email Peserta *
                </label>
                <input
                  id="part-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="part-code" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kode Identitas Unik (NISN / NIM / NIP)
                </label>
                <input
                  id="part-code"
                  type="text"
                  required
                  value={participantCode}
                  onChange={(e) => setParticipantCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="part-grp" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kelompok atau Kelas
                </label>
                <select
                  id="part-grp"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4A7C59] rounded-lg"
                >
                  Simpan Peserta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const GroupsPage: React.FC = () => {
  const { currentUser, groups, createGroup } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<EducationLevel>('SMA/SMK/MA');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createGroup({
      name: name.trim(),
      code: code.trim() || `GRP-${Math.floor(10 + Math.random() * 89)}`,
      level,
      description: description.trim() || 'Kelompok peserta asesmen.',
      organizationId: currentUser.organizationId,
    });
    setName('');
    setCode('');
    setDescription('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Beranda <span className="mx-1">/</span> Kelompok atau Kelas
          </div>
          <h1 className="text-2xl font-bold text-[#111C2D]">Manajemen Kelompok &amp; Kelas</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Organisasikan peserta ke dalam kelas, angkatan pelatihan, atau divisi kerja untuk penugasan ujian massal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Buat Kelompok Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((grp) => (
          <div
            key={grp.id}
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono-tabular font-semibold text-[#4A7C59]">{grp.code}</span>
                <span>·</span>
                <span>{grp.level}</span>
              </div>
              <h3 className="text-base font-bold text-[#111C2D]">{grp.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{grp.description}</p>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-slate-500">Anggota Terdaftar</span>
              <span className="font-mono-tabular font-bold text-[#111C2D]">
                {grp.memberIds.length} Peserta
              </span>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[#111C2D]">Buat Kelompok atau Kelas Baru</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="grp-name" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Nama Kelompok / Kelas *
                </label>
                <input
                  id="grp-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kelas XI MIPA 2 / Batch Workshop B"
                  className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="grp-code" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kode Kelompok
                </label>
                <input
                  id="grp-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="XI-MIPA-2"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="grp-lvl" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Jenjang / Kategori
                </label>
                <select
                  id="grp-lvl"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as EducationLevel)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="PAUD/TK">PAUD / TK</option>
                  <option value="SD/MI">SD / MI</option>
                  <option value="SMP/MTs">SMP / MTs</option>
                  <option value="SMA/SMK/MA">SMA / SMK / MA</option>
                  <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                  <option value="Kursus & Pelatihan">Lembaga Kursus &amp; Pelatihan</option>
                  <option value="Instansi Pemerintah">Instansi Pemerintah</option>
                  <option value="Perusahaan & Korporasi">Perusahaan &amp; Korporasi</option>
                  <option value="Organisasi & Umum">Organisasi &amp; Umum</option>
                </select>
              </div>

              <div>
                <label htmlFor="grp-desc" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  id="grp-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4A7C59] rounded-lg"
                >
                  Simpan Kelompok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfileAndSettingsPage: React.FC = () => {
  const { currentUser, updateCurrentUserProfile, logout, addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    currentUser.avatarUrl
  );
  const [notifEmail, setNotifEmail] = useState(currentUser.notificationEmail);
  const [notifInApp, setNotifInApp] = useState(currentUser.notificationInApp);
  const [privacyShowScore, setPrivacyShowScore] = useState(
    currentUser.privacyShowScoreToGroup
  );
  const [newPassword, setNewPassword] = useState('');

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addToast('error', 'Format File Tidak Didukung', 'Gunakan gambar berformat JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Ukuran File Terlalu Besar', 'Ukuran foto profil maksimum adalah 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAvatarPreview(dataUrl);
      updateCurrentUserProfile({ avatarUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      fullName: fullName.trim() || currentUser.fullName,
      jobTitle: jobTitle.trim() || currentUser.jobTitle,
      avatarUrl: avatarPreview,
      notificationEmail: notifEmail,
      notificationInApp: notifInApp,
      privacyShowScoreToGroup: privacyShowScore,
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast('error', 'Kata Sandi Terlalu Pendek', 'Kata sandi baru minimal harus 8 karakter.');
      return;
    }
    setNewPassword('');
    addToast('success', 'Kata Sandi Diperbarui', 'Kata sandi autentikasi akun Anda berhasil diperbarui.');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E8F0] pb-5">
        <div className="text-xs text-slate-500 mb-1">
          Beranda <span className="mx-1">/</span> Profil &amp; Pengaturan Akun
        </div>
        <h1 className="text-2xl font-bold text-[#111C2D]">Profil &amp; Pengaturan Keamanan Akun</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Kelola foto profil, identitas profesional, preferensi notifikasi, dan keamanan sesi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Avatar & Account Verification Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
            <h2 className="text-base font-bold text-[#111C2D]">Foto Profil</h2>
            <div className="flex items-center gap-4">
              <UserAvatar name={fullName} avatarUrl={avatarPreview} size="xl" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-[#111C2D]">{currentUser.fullName}</div>
                <div className="text-xs text-[#4A7C59] font-semibold">
                  {ROLE_LABELS[currentUser.role]}
                </div>
                <div className="text-[11px] text-slate-500">
                  Format: JPG, PNG, WEBP (Maks. 2 MB)
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Unggah / Ganti Foto</span>
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(undefined);
                    updateCurrentUserProfile({ avatarUrl: undefined });
                  }}
                  className="py-2 px-3 bg-red-50 text-[#DC2626] border border-red-200 text-xs font-semibold rounded-lg"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3 text-xs">
            <h2 className="text-base font-bold text-[#111C2D]">Status Keamanan &amp; Sesi</h2>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-slate-500">Status Verifikasi Email</span>
              <span className="font-semibold text-[#16A34A]">Terverifikasi (Aktif)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-slate-500">Isolasi Organisasi (RLS)</span>
              <span className="font-mono-tabular font-semibold">{currentUser.organizationId}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Pembaruan Terakhir</span>
              <span className="font-mono-tabular">{currentUser.updatedAt.slice(0, 10)}</span>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={logout}
                className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-[#DC2626] border border-red-200 rounded-lg font-semibold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Akhiri Sesi &amp; Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Account Information, Notification & Security Forms */}
        <div className="lg:col-span-8 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5"
          >
            <h2 className="text-base font-bold text-[#111C2D]">Informasi Akun &amp; Organisasi</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="prof-email" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Email Login (Terverifikasi)
                </label>
                <input
                  id="prof-email"
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-[#E2E8F0] rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="prof-role" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Peran Akun (Dikelola Administrator)
                </label>
                <input
                  id="prof-role"
                  type="text"
                  value={ROLE_LABELS[currentUser.role]}
                  disabled
                  className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-[#E2E8F0] rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="prof-org" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Organisasi / Institusi
                </label>
                <input
                  id="prof-org"
                  type="text"
                  value={currentUser.organizationName}
                  disabled
                  className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-[#E2E8F0] rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="prof-job" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Jabatan atau Profesi
                </label>
                <input
                  id="prof-job"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold text-[#111C2D]">
                Preferensi Notifikasi &amp; Privasi Data
              </div>
              <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.checked)}
                  className="rounded border-slate-300 text-[#4A7C59]"
                />
                <span>Kirim pemberitahuan jadwal ujian dan publikasi laporan melalui Email</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifInApp}
                  onChange={(e) => setNotifInApp(e.target.checked)}
                  className="rounded border-slate-300 text-[#4A7C59]"
                />
                <span>Tampilkan notifikasi langsung di dalam aplikasi (Command Center &amp; Penilaian)</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyShowScore}
                  onChange={(e) => setPrivacyShowScore(e.target.checked)}
                  className="rounded border-slate-300 text-[#4A7C59]"
                />
                <span>Izinkan penampilan peringkat agregat anonim pada kelompok belajar</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          </form>

          {/* Password Change Form */}
          <form
            onSubmit={handlePasswordChange}
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-[#111C2D] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#4A7C59]" />
              <span>Penggantian Kata Sandi Autentikasi</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="sec-pass" className="block text-xs font-semibold text-[#111C2D] mb-1">
                  Kata Sandi Baru (Minimal 8 Karakter)
                </label>
                <input
                  id="sec-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru..."
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#111C2D] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg w-fit"
              >
                Perbarui Kata Sandi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const AdminUsersPage: React.FC = () => {
  const { users, toggleUserStatus, updateUserRoleByAdmin } = useApp();

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E8F0] pb-5">
        <div className="text-xs text-slate-500 mb-1">
          Tata Kelola &amp; Admin <span className="mx-1">/</span> Pengguna &amp; Hak Akses
        </div>
        <h1 className="text-2xl font-bold text-[#111C2D]">Manajemen Pengguna &amp; Otorisasi Peran</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Kelola peran akun (Superadmin, Admin Organisasi, Instruktur, Peserta) serta status aktif pengguna.
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                <th className="py-3 px-4 font-semibold">Nama Pengguna</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Organisasi</th>
                <th className="py-3 px-4 font-semibold">Peran RBAC</th>
                <th className="py-3 px-4 font-semibold">Status Akun</th>
                <th className="py-3 px-4 font-semibold text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-semibold text-[#111C2D]">{u.fullName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{u.email}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{u.organizationName}</td>
                  <td className="py-3.5 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRoleByAdmin(u.uid, e.target.value as UserRole)}
                      aria-label={`Ubah peran ${u.fullName}`}
                      className="px-2.5 py-1 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-md"
                    >
                      <option value="participant">Peserta</option>
                      <option value="instructor">Instruktur</option>
                      <option value="org_admin">Admin Organisasi</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold">
                    {u.status === 'active' ? (
                      <span className="text-[#16A34A]">Aktif</span>
                    ) : (
                      <span className="text-[#DC2626]">Dinonaktifkan</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleUserStatus(u.uid)}
                      className="px-3 py-1 text-xs font-semibold bg-[#F8F9F7] border border-[#E2E8F0] rounded-md hover:bg-slate-100"
                    >
                      {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminOrganizationsPage: React.FC = () => {
  const { organizations, createOrganizationByAdmin } = useApp();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sector, setSector] = useState<EducationLevel>('SMA/SMK/MA');
  const [address, setAddress] = useState('');

  const handleAddOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createOrganizationByAdmin({
      name: name.trim(),
      code: code.trim() || `ORG-${Math.floor(100 + Math.random() * 899)}`,
      sector,
      address: address.trim() || 'Indonesia',
    });
    setName('');
    setCode('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E8F0] pb-5">
        <div className="text-xs text-slate-500 mb-1">
          Tata Kelola &amp; Admin <span className="mx-1">/</span> Organisasi Terdaftar
        </div>
        <h1 className="text-2xl font-bold text-[#111C2D]">Manajemen Multi-Organisasi</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Isolasi data dan hak akses untuk setiap sekolah, perguruan tinggi, lembaga pelatihan, atau instansi.
        </p>
      </div>

      <form
        onSubmit={handleAddOrg}
        className="bg-white border border-[#E2E8F0] rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div>
          <label htmlFor="org-name" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Nama Organisasi Baru *
          </label>
          <input
            id="org-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Politeknik Negeri Nusantara"
            className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="org-code" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Kode Institusi
          </label>
          <input
            id="org-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PNN-ID"
            className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="org-sec" className="block text-xs font-semibold text-[#111C2D] mb-1">
            Sektor / Jenjang
          </label>
          <select
            id="org-sec"
            value={sector}
            onChange={(e) => setSector(e.target.value as EducationLevel)}
            className="w-full px-3 py-2 text-xs bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg"
          >
            <option value="PAUD/TK">PAUD / TK</option>
            <option value="SD/MI">SD / MI</option>
            <option value="SMP/MTs">SMP / MTs</option>
            <option value="SMA/SMK/MA">SMA / SMK / MA</option>
            <option value="Perguruan Tinggi">Perguruan Tinggi</option>
            <option value="Kursus & Pelatihan">Kursus &amp; Pelatihan</option>
            <option value="Instansi Pemerintah">Instansi Pemerintah</option>
            <option value="Perusahaan & Korporasi">Perusahaan &amp; Korporasi</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-xs font-semibold rounded-lg"
        >
          + Tambah Organisasi
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono-tabular font-bold text-[#4A7C59]">{org.code}</span>
              <span>{org.sector}</span>
            </div>
            <h3 className="text-base font-bold text-[#111C2D]">{org.name}</h3>
            <p className="text-xs text-slate-500">{org.address}</p>
            <div className="pt-3 border-t border-[#E2E8F0] flex justify-between text-xs">
              <span>Anggota: <strong>{org.memberCount}</strong></span>
              <span>Kegiatan Aktif: <strong>{org.activeAssessmentCount}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminAuditLogsPage: React.FC = () => {
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E8F0] pb-5">
        <div className="text-xs text-slate-500 mb-1">
          Tata Kelola &amp; Admin <span className="mx-1">/</span> Audit Log Sistem
        </div>
        <h1 className="text-2xl font-bold text-[#111C2D]">Rekaman Audit Log Keamanan &amp; Operasional</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Catatan seluruh aktivitas penting: publikasi ujian, penilaian manual, intervensi Command Center, dan perubahan hak akses.
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F9F7] text-xs text-slate-500">
                <th className="py-3 px-4 font-semibold">Waktu (UTC/WIB)</th>
                <th className="py-3 px-4 font-semibold">Aktor &amp; Peran</th>
                <th className="py-3 px-4 font-semibold">Aksi</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Rincian Kejadian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                    {log.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#111C2D]">{log.actorName}</div>
                    <div className="text-slate-500">{ROLE_LABELS[log.actorRole]}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular font-bold text-[#4A7C59]">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-slate-600">
                    {log.targetType}:{log.targetId}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
