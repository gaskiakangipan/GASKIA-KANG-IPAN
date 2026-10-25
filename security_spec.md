# Security Specification — ASKIA (TEStra) Firestore Hardened Rules

## 1. Data Invariants
1. **Default-Deny Catch-All**: Semua path yang tidak didefinisikan secara eksplisit ditolak (`allow read, write: if false;`).
2. **Verified Identity**: Semua operasi tulis (`create`, `update`, `delete`) wajib berasal dari pengguna terautentikasi dengan email terverifikasi (`request.auth != null && request.auth.token.email_verified == true`).
3. **PII Isolation (Split Collection)**: Data sensitif seperti `email` disimpan terpisah di `/users/{userId}/private/{docId}` dan hanya boleh dibaca/ditulis oleh pemiliknya (`request.auth.uid == userId`) atau Admin terverifikasi.
4. **Role Escalation Prevention**: Pengguna yang membuat profil di `/users/{userId}` hanya dapat menetapkan `role == 'participant'` atau `role == 'instructor'` (tidak dapat menetapkan `superadmin` sendiri). Field `uid`, `role`, dan `createdAt` bersifat immutable saat `update` oleh pemilik non-admin.
5. **Strict Key & Size Boundaries**: Setiap dokumen yang dibuat atau diperbarui wajib lolos helper `isValid[Entity]()` yang memeriksa `keys().hasAll()`, `keys().hasOnly()`, tipe data, ukuran string (`.size() <= maxLength`), dan pola regex ID (`^[a-zA-Z0-9_\-]+$`).
6. **Temporal Integrity**: Setiap `createdAt` saat `create` dan `updatedAt` saat `update` wajib sama persis dengan `request.time`.
7. **Terminal State Locking**: Percobaan ujian (`/attempts/{attemptId}`) yang telah mencapai status `'graded'` bersifat terminal dan tidak dapat diubah lagi oleh peserta.
8. **Secure List Queries**: Setiap aturan `allow list` mengevaluasi `resource.data` terhadap `request.auth.uid` (tanpa delegasi buta ke klien dan tanpa `get()`/`exists()` di dalam `list`).

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Unverified Email Spoof)**: Pengguna dengan `email_verified: false` mencoba membuat dokumen di `/assessments/a1`. -> `PERMISSION_DENIED`
2. **Payload 2 (Self-Assigned Superadmin)**: Pengguna membuat `/users/u1` dengan `role: 'superadmin'`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow Field Injection on Create)**: Membuat `/questions/q1` dengan field tambahan `isSecretBypass: true`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow Field Injection on Update)**: Memperbarui `/assessments/a1` dengan menambahkan field `hacked: 1`. -> `PERMISSION_DENIED`
5. **Payload 5 (Owner Spoofing)**: Pengguna `u1` membuat `/assessments/a1` dengan `ownerId: 'u2'`. -> `PERMISSION_DENIED`
6. **Payload 6 (PII Cross-User Read)**: Pengguna `u2` melakukan `get` pada `/users/u1/private/info`. -> `PERMISSION_DENIED`
7. **Payload 7 (ID Poisoning)**: Membuat dokumen dengan ID yang mengandung karakter ilegal atau lebih dari 128 karakter. -> `PERMISSION_DENIED`
8. **Payload 8 (Denial of Wallet / Oversized String)**: Membuat `/questions/q1` dengan `prompt` sepanjang 5.000 karakter (melebihi batas 2.000). -> `PERMISSION_DENIED`
9. **Payload 9 (Timestamp Forgery)**: Membuat `/attempts/at1` dengan `createdAt` masa lalu (bukan `request.time`). -> `PERMISSION_DENIED`
10. **Payload 10 (Immutable Field Tampering)**: Peserta mengubah `participantId` atau `createdAt` saat `update` `/attempts/at1`. -> `PERMISSION_DENIED`
11. **Payload 11 (Terminal State Re-opening)**: Peserta mencoba mengubah `/attempts/at1` yang sudah berstatus `'graded'` kembali menjadi `'in_progress'`. -> `PERMISSION_DENIED`
12. **Payload 12 (Blanket List Scraping)**: Pengguna `u2` melakukan query `list` tanpa filter kepemilikan pada `/attempts`. -> `PERMISSION_DENIED`
