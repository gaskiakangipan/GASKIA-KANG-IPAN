import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EducationLevel, UserRole } from '../types/assessment';

export const LoginPage: React.FC = () => {
  const { loginWithCredentials, loginWithGoogle, switchRoleDemo, addToast } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('hendra.wijaya@sman1-nusantara.sch.id');
  const [password, setPassword] = useState('••••••••••••');
  const [examCode, setExamCode] = useState('POST-BIO-26');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    setError('');
    loginWithCredentials(email);
    navigate('/dashboard');
  };

  const handleDemoQuickLogin = (role: UserRole) => {
    switchRoleDemo(role);
    navigate('/dashboard');
  };

  const handleJoinCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode.trim()) {
      addToast('error', 'Kode Akses Kosong', 'Masukkan kode akses ujian terlebih dahulu.');
      return;
    }
    navigate(`/join/${encodeURIComponent(examCode.trim().toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] flex flex-col justify-between p-6 lg:p-12">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-[#111C2D] font-display font-bold">
          <div className="w-9 h-9 rounded-lg bg-[#4A7C59] text-white flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <span className="text-lg font-bold">ASESMEN-ASKIA</span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-2">
              Satu Platform, Semua Asesmen
            </span>
          </div>
        </Link>
        <Link
          to="/register"
          className="px-4 py-2 text-xs font-semibold text-[#111C2D] bg-white border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
        >
          Daftar Akun Baru
        </Link>
      </div>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-8 items-stretch">
        {/* Left Column: Value Proposition & Instant Exam Join */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-6">
          <div className="space-y-4">
            <div className="text-xs font-semibold text-[#4A7C59]">
              Platform Asesmen Digital Universal
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#111C2D] leading-tight">
              Kelola Pretest, Posttest, dan Evaluasi Kompetensi Secara Terpadu
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dirancang untuk satuan pendidikan (PAUD/TK, SD, SMP, SMA/SMK, Perguruan Tinggi),
              lembaga pelatihan, instansi pemerintah, dan korporasi dengan analisis N-Gain serta
              butir soal otomatis.
            </p>
            <div className="pt-2 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4A7C59] shrink-0" />
                <span>Pasangan Pretest &amp; Posttest dengan perhitungan N-Gain otomatis</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4A7C59] shrink-0" />
                <span>10 jenis butir soal (Pilihan Ganda Kompleks, Numerik, Menjodohkan, Esai, Studi Kasus)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4A7C59] shrink-0" />
                <span>Command Center pemantauan langsung &amp; isolasi hak akses multi-organisasi</span>
              </div>
            </div>
          </div>

          {/* Direct Exam Code Box */}
          <form onSubmit={handleJoinCode} className="pt-6 border-t border-[#E2E8F0] space-y-3">
            <label htmlFor="quick-exam-code" className="block text-xs font-semibold text-[#111C2D]">
              Punya Kode Akses Ujian Peserta?
            </label>
            <div className="flex gap-2">
              <input
                id="quick-exam-code"
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                placeholder="Contoh: POST-BIO-26 atau SPBE-2026"
                className="flex-1 px-3.5 py-2 text-sm font-mono-tabular bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#111C2D] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span>Masuk Ujian</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Login Form & Demo Role Selector */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#111C2D]">Masuk ke Akun ASESMEN-ASKIA</h2>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan akun organisasi Anda atau pilih akses cepat peran demo untuk pengujian.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626] font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-[#111C2D] mb-1.5">
                  Email Institusi / Pengguna
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-[#111C2D]">
                    Kata Sandi
                  </label>
                  <Link to="/forgot-password" className="text-xs text-[#4A7C59] hover:underline">
                    Lupa kata sandi?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Masuk ke Dashboard
              </button>
            </form>

            <button
              type="button"
              onClick={async () => {
                await loginWithGoogle();
                navigate('/dashboard');
              }}
              className="w-full py-2.5 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111C2D] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#4A7C59]" />
              <span>Masuk dengan Google Workspace / Akun Terverifikasi</span>
            </button>
          </div>

          {/* Demo Role Switcher Cards */}
          <div className="pt-5 border-t border-[#E2E8F0] space-y-2.5">
            <div className="text-xs font-semibold text-slate-500">
              Simulasi Cepat Hak Akses Berbasis Peran [DATA DEMO]:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('instructor')}
                className="p-2.5 text-left rounded-lg border border-[#E2E8F0] hover:border-[#4A7C59] hover:bg-[#EEF4F0]/50 transition-colors"
              >
                <div className="text-xs font-semibold text-[#111C2D]">Instruktur / Guru</div>
                <div className="text-[11px] text-slate-500 truncate">Dr. Hendra Wijaya</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('participant')}
                className="p-2.5 text-left rounded-lg border border-[#E2E8F0] hover:border-[#4A7C59] hover:bg-[#EEF4F0]/50 transition-colors"
              >
                <div className="text-xs font-semibold text-[#111C2D]">Peserta Ujian</div>
                <div className="text-[11px] text-slate-500 truncate">Alya Putri Maharani</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('org_admin')}
                className="p-2.5 text-left rounded-lg border border-[#E2E8F0] hover:border-[#4A7C59] hover:bg-[#EEF4F0]/50 transition-colors"
              >
                <div className="text-xs font-semibold text-[#111C2D]">Admin Organisasi</div>
                <div className="text-[11px] text-slate-500 truncate">Dra. Ratna Sari Dewi</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoQuickLogin('superadmin')}
                className="p-2.5 text-left rounded-lg border border-[#E2E8F0] hover:border-[#4A7C59] hover:bg-[#EEF4F0]/50 transition-colors"
              >
                <div className="text-xs font-semibold text-[#111C2D]">Superadmin</div>
                <div className="text-[11px] text-slate-500 truncate">Ir. Bagus Pratama</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500">
        © 2026 ASESMEN-ASKIA — Platform Asesmen Digital Universal. Dilindungi enkripsi dan kebijakan Row-Level Security.
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { addParticipantUser, loginWithCredentials, organizations, groups } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'instructor' | 'participant'>('instructor');
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || 'org-sman1');
  const [sector, setSector] = useState<EducationLevel>('SMA/SMK/MA');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 3) {
      setError('Nama lengkap minimal 3 karakter.');
      return;
    }
    if (!email.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    addParticipantUser({
      fullName: fullName.trim(),
      email: email.trim(),
      participantCode: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      groupId: groups[0]?.id || '',
      organizationId,
    });
    loginWithCredentials(email.trim(), role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A7C59] text-white flex items-center justify-center font-bold">
              A
            </div>
            <span className="font-display font-bold text-base text-[#111C2D]">ASESMEN-ASKIA</span>
          </div>
          <Link to="/login" className="text-xs font-semibold text-[#4A7C59] hover:underline">
            Sudah punya akun? Masuk
          </Link>
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#111C2D] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#4A7C59]" />
            <span>Registrasi Akun Baru</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Buat akun instruktur penyelenggara asesmen atau akun peserta ujian.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold text-[#111C2D] mb-1">
              Nama Lengkap &amp; Gelar
            </label>
            <input
              id="reg-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Siti Nurhaliza, S.Pd."
              required
              className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-[#111C2D] mb-1">
              Alamat Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@institusi.ac.id"
              required
              className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-role" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Peran Pengguna
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'instructor' | 'participant')}
                className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
              >
                <option value="instructor">Instruktur / Pembuat Asesmen</option>
                <option value="participant">Peserta Ujian</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-sector" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Jenjang / Sektor
              </label>
              <select
                id="reg-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value as EducationLevel)}
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
                <option value="Organisasi & Umum">Organisasi &amp; Umum</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reg-org" className="block text-xs font-semibold text-[#111C2D] mb-1">
              Organisasi / Satuan Pendidikan
            </label>
            <select
              id="reg-org"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Buat Akun &amp; Masuk
          </button>
        </form>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { addToast } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSent(true);
    addToast('success', 'Tautan Pemulihan Dikirim', `Instruksi reset kata sandi telah dikirim ke ${email}.`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-5">
        <div className="flex items-center gap-2 text-[#111C2D] font-bold">
          <KeyRound className="w-5 h-5 text-[#4A7C59]" />
          <h1 className="text-lg">Pemulihan Kata Sandi Akun</h1>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Masukkan alamat email yang terdaftar pada organisasi Anda. Sistem akan mengirimkan tautan
          verifikasi pengaturan ulang kata sandi.
        </p>

        {sent ? (
          <div className="p-4 rounded-lg bg-[#EEF4F0] text-xs text-[#3D6849] space-y-2">
            <div className="font-semibold">Tautan Pemulihan Terkirim!</div>
            <p>Silakan periksa kotak masuk email {email} untuk melanjutkan pengaturan ulang kata sandi.</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[#111C2D] mb-1">
                Email Terdaftar
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@institusi.sch.id"
                className="w-full px-3.5 py-2 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7C59]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#4A7C59] hover:bg-[#3D6849] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Kirim Tautan Pemulihan
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-[#E2E8F0] text-center">
          <Link to="/login" className="text-xs font-semibold text-[#4A7C59] hover:underline">
            ← Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  );
};
