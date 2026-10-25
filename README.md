# ASKIA (TEStra) — Platform Asesmen Digital Universal

**Satu Platform, Semua Asesmen.** Aplikasi web full-stack untuk membuat, mengelola, melaksanakan, memantau, dan mengevaluasi kegiatan **Pretest** serta **Posttest** secara online untuk satuan pendidikan (PAUD/TK, SD, SMP, SMA/SMK, Perguruan Tinggi), lembaga kursus, instansi pemerintah, korporasi, dan umum.

---

## 1. Fitur yang Sudah Berfungsi

1. **Autentikasi & Hak Akses Berbasis Peran (RBAC)**:
   - Mendukung 4 peran utama: **Superadmin**, **Admin Organisasi**, **Instruktur / Pembuat Asesmen**, dan **Peserta**.
   - Terintegrasi dengan Google Authentication (`signInWithPopup`), login email institusi, serta *Role Switcher* instan pada header untuk simulasi dan pengujian lintas peran.
2. **Dashboard Multi-Peran**:
   - **Dashboard Instruktur**: 8 kartu statistik real-time (Total Kegiatan, Kegiatan Aktif, Draf, Perlu Difinalisasi, Total Peserta, Total Pengerjaan, Rata-rata Nilai, Persentase Penyelesaian), grafik Recharts perbandingan Pretest vs Posttest, aktivitas peserta terbaru, dan kartu kegiatan.
   - **Dashboard Peserta**: Daftar ujian tersedia, sedang dikerjakan, selesai, input cepat kode akses ujian, dan tabel riwayat nilai.
   - **Dashboard Superadmin**: Ringkasan operasional multi-organisasi, total pengguna, kegiatan lintas instansi, dan rekaman audit log.
3. **Modul Kegiatan Asesmen & Wizard 6 Langkah**:
   - Daftar kegiatan dengan tampilan **Kartu** dan **Tabel**, tab status (*Semua, Siap Diujikan, Draf, Terjadwal, Sedang Berlangsung, Selesai, Diarsipkan*), pencarian, filter, pengurutan, pagination, duplikasi, arsip, pemulihan, hapus dengan modal konfirmasi, dan ekspor CSV.
   - Wizard 6 langkah: Informasi Kegiatan → Jenis Asesmen & Pasangan Pretest/Posttest → Pengaturan Soal → Peserta & Jadwal → Pengaturan Hasil → Pratinjau, Validasi, dan Publikasi (mengunci snapshot soal).
4. **Modul Bank Soal (10 Tipe Soal)**:
   - Mendukung: *Pilihan Ganda 1 Jawaban, Pilihan Ganda Kompleks (Partial Credit / All-or-Nothing), Benar/Salah, Isian Singkat (normalisasi spasi & huruf), Jawaban Numerik (dengan toleransi deviasi), Menjodohkan, Mengurutkan, Esai dengan Rubrik, Soal Berbasis Gambar/Diagram SVG, dan Studi Kasus Berbasis Bacaan & Tabel*.
   - Mendukung pembuatan soal, duplikasi, pengarsipan massal, pratinjau soal, serta **Impor JSON & CSV/Spreadsheet** lengkap dengan validasi struktur dan deteksi duplikasi.
5. **Halaman Pengerjaan Ujian Fokus & Bebas Gangguan (`/exam/[attemptId]`)**:
   - Timer hitung mundur dengan pengumpulan otomatis saat waktu habis, indikator *Autosave*, navigasi nomor soal, tombol *Tandai untuk Ditinjau*, peringatan jawaban kosong sebelum mengumpulkan, pencegahan pengumpulan ganda, dan pencatatan integritas saat berpindah tab.
6. **Sistem Penilaian Otomatis & Manual Esai + Command Center (`/activities/[id]/command-center`)**:
   - Penilaian otomatis instan untuk seluruh soal objektif.
   - Pemantauan sesi langsung di Command Center (Tambah waktu +10 menit, hentikan/kumpulkan paksa, dan modal **Penilaian Esai Manual** berdasarkan rubrik untuk mengubah status *Nilai Sementara* menjadi *Nilai Final*).
7. **Sistem Pasangan Pretest–Posttest, N-Gain & Analitik (`/results`)**:
   - Pemasangan peserta berdasarkan ID unik terverifikasi (`participantId`).
   - Perhitungan selisih nilai ($\Delta$), persentase perubahan relatif (aman dari pembagian nol saat Pretest = 0), dan indeks **N-Gain** (aman saat nilai awal sudah mencapai nilai maksimum).
   - Analisis butir soal empiris (proporsi menjawab benar $P$, distribusi opsi, dan deteksi otomatis soal yang perlu ditinjau).
8. **Laporan & Ekspor (`/reports`)**:
   - Ekspor data sinkron dalam format **Excel (.xls)**, **CSV**, dan **Cetak / PDF**.
9. **Profil & Pengaturan Akun (`/profile`, `/settings`)**:
   - Unggah, pratinjau, ganti, dan hapus foto profil dengan validasi tipe (JPG/PNG/WEBP) dan ukuran ($\le 2\text{MB}$), pengaturan notifikasi, privasi, serta penggantian kata sandi.

---

## 2. Fitur Lanjutan yang Dapat Dikembangkan (Roadmap)

- Integrasi proctoring berbasis kamera WebRTC streaming ke server penyimpanan eksternal.
- Pengiriman email transaksional menggunakan SMTP kustom organisasi.

---

## 3. Struktur Proyek

```text
├── firebase-blueprint.json             # Blueprint skema entitas & koleksi Firestore
├── firestore.rules                     # Aturan keamanan Firestore (ABAC & 8 Pilar Hardened)
├── firestore.rules.test.ts             # Pengujian otomatis aturan keamanan
├── security_spec.md                    # Spesifikasi invarian keamanan & Dirty Dozen payloads
├── supabase/migrations/
│   └── 001_initial_schema.sql          # Skema relasional PostgreSQL / Supabase (21 tabel + RLS)
├── src/
│   ├── components/
│   │   ├── AppShell.tsx                # Layout utama, Sidebar kolapsibel, Header & Notifikasi
│   │   └── DiagramStimulus.tsx         # Diagram ilmiah SVG & komponen Avatar
│   ├── context/
│   │   └── AppContext.tsx              # State global, RBAC, sinkronisasi Firestore & CRUD
│   ├── data/
│   │   └── seedData.ts                 # Data demo komprehensif ([DATA DEMO])
│   ├── lib/
│   │   └── firebase.ts                 # Inisialisasi Firebase Auth & Firestore + Error Handler
│   ├── pages/
│   │   ├── ActivitiesPages.tsx         # Daftar kegiatan, Wizard 6 langkah & Detail kegiatan
│   │   ├── AnalyticsAndReportsPages.tsx# Analitik Pretest-Posttest (N-Gain), Butir Soal & Laporan
│   │   ├── AuthPages.tsx               # Login, Registrasi, Lupa Kata Sandi & Kode Ujian
│   │   ├── CommandCenterPage.tsx       # Pemantauan ujian langsung & Penilaian Esai Manual
│   │   ├── DashboardPage.tsx           # Dashboard Instruktur, Peserta, dan Superadmin
│   │   ├── ExamPages.tsx               # Halaman Join Ujian, Pengerjaan Ujian & Hasil Ujian
│   │   ├── ManagementAndAdminPages.tsx # Peserta, Kelompok, Profil, Pengaturan & Admin
│   │   └── QuestionBankPages.tsx       # Bank Soal 10 tipe, Editor Soal & Impor CSV/JSON
│   ├── types/
│   │   └── assessment.ts               # Definisi tipe TypeScript menyeluruh
│   └── utils/
│       ├── scoring.ts                  # Mesin penilaian, N-Gain, statistik & analisis butir soal
│       └── scoring.test.ts             # Unit test logika penilaian & analitik
```

---

## 4. Cara Menjalankan Aplikasi Secara Lokal

1. Instal seluruh dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan (port 3000):
   ```bash
   npm run dev
   ```
3. Jalankan pengujian unit dan aturan keamanan:
   ```bash
   npx --yes tsx --test src/utils/scoring.test.ts
   npx --yes tsx --test firestore.rules.test.ts
   ```

---

## 5. Konfigurasi Database, Migration & Seed

- **Firestore (Aktif secara langsung di lingkungan ini)**:
  - Konfigurasi proyek tersimpan di `firebase-applet-config.json` dan aturan keamanan dideploy melalui `firestore.rules`.
- **PostgreSQL / Supabase Migration**:
  - Jalankan berkas `supabase/migrations/001_initial_schema.sql` pada SQL Editor Supabase atau melalui CLI `supabase db push` untuk membuat ke-21 tabel relasional beserta indeks dan kebijakan Row-Level Security (RLS).

---

## 6. Cara Membuat Akun Administrator Secara Aman

- Pengguna biasa yang mendaftar melalui `/register` hanya dapat memperoleh peran `participant` atau `instructor` (dicegah oleh aturan keamanan agar tidak terjadi eskalasi mandiri).
- Untuk menetapkan akun sebagai `superadmin`, tambahkan UID pengguna ke koleksi `/admins/{uid}` melalui konsol database atau gunakan akun email administrator utama yang terdaftar pada aturan keamanan, lalu kelola peran pengguna lain melalui halaman `/admin/users`.
