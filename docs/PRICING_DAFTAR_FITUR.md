# Daftar Fitur Project Purchasing Go — Pertimbangan Harga Development

**Project:** Sistem verifikasi dokumen medis (surat sakit) + panel admin klinik  
**Stack:** React/TypeScript + FastAPI + PostgreSQL + Redis + MinIO + Docker  
**Scope dokumen:** Development saja (belum termasuk deployment, hosting, domain, maintenance bulanan)  
**Lokasi referensi pasar:** Semarang / Jawa Tengah

---

## Ringkasan Cepat

| Kategori | Modul | Kompleksitas |
|----------|-------|--------------|
| Core bisnis | OCR, PDF/QR, verifikasi publik | Tinggi |
| Auth & keamanan | JWT, RBAC, rate limit, Turnstile | Tinggi |
| Admin | User, role, settings, profil | Sedang |
| Dashboard | Widget + WebSocket realtime | Sedang |
| Media & storage | Upload, MinIO/S3, serve publik | Sedang |
| UI/UX | Admin shell, mobile, dark mode | Sedang |
| Infra (kode) | Docker, migration, seed, nginx config | Sedang |

**Estimasi effort:** ±300–450 jam efektif (solo mid-level, dengan template admin)

---

## 1. Modul Core — Dokumen Medis & Verifikasi

**Bobot penawaran:** 35–40% dari total development

### 1.1 Upload & OCR Surat Sakit
- Upload PDF (drag-and-drop / klik)
- OCR halaman pertama (Tesseract)
- Parsing otomatis: no surat, nama, no RM, tanggal lahir, tanggal surat, masa istirahat, dokter, diagnosa
- Panel raw OCR text + form editable
- Simpan draft ke database (`POST /medical/ocr`, `PATCH /medical/:id`)

### 1.2 Stempel QR ke PDF
- QR menuju URL publik `/verify/{id}`
- Mode 1: Simpan PDF digital ber-QR (MinIO / lokal)
- Mode 2: Print surat utuh + QR
- Mode 3: Print stempel QR saja
- Metadata: bucket, object key, checksum SHA256, public URL

### 1.3 Manajemen Dokumen (Admin)
- Daftar surat: paginasi + pencarian
- Detail & edit inline
- Hapus dokumen + file PDF terkait
- Preview PDF (iframe) + full-screen di mobile
- Download PDF berstempel

### 1.4 Verifikasi Publik (QR)
- Halaman `/verify/:uuid` tanpa login
- Ringkasan dokumen (no surat, nama, masa istirahat)
- Gate tanggal lahir (`ddmmyyyy`) sebelum buka PDF
- Rate limit anti-spam / brute-force

---

## 2. Modul Auth & Keamanan

**Bobot penawaran:** 15–20%

### 2.1 Autentikasi
- Login email/username + password
- JWT access + refresh (HttpOnly cookie)
- Remember me (30 hari)
- Logout + clear session
- Auto refresh session di frontend
- Registrasi publik dinonaktifkan secara default

### 2.2 Authorization (RBAC)
- 18 permission (user, role, setting, myprofile)
- Role superadmin bypass
- Route guard frontend + permission per endpoint backend
- Default-deny: API admin wajib login

### 2.3 Keamanan Tambahan
- Cloudflare Turnstile pada login (opsional)
- Rate limit: login, verifikasi view, verifikasi tanggal lahir
- Cookie Secure (HTTPS)
- Session idle 30 menit + modal peringatan
- Impersonate user (superadmin)

---

## 3. Modul Admin — Pengguna & Role

**Bobot penawaran:** 15–18%

### 3.1 Manajemen User
- CRUD, soft delete, force delete
- Assign role, foto profil, reset password admin
- Tab Active / Deleted, impersonate
- Layout mobile + desktop

### 3.2 Manajemen Role & Permission
- List role, edit nama/guard
- Permission picker (grouped, select-all)

### 3.3 Profil Sendiri
- Edit data, ganti password, avatar inisial

---

## 4. Modul Settings & Branding

**Bobot penawaran:** 8–10%

- General: nama situs, tagline, perusahaan, copyright
- Appearance: logo, favicon (upload max 2MB)
- Cache Redis, branding di halaman login
- Grup general/appearance readable publik (tanpa login)

---

## 5. Modul Dashboard & Realtime

**Bobot penawaran:** 8–10%

- Widget total dokumen, daftar terbaru (12 item)
- Shortcut upload, download PDF
- WebSocket realtime (dokumen dibuat/dihapus)
- Indikator Live + animasi baris baru

---

## 6. Modul Media & Storage

**Bobot penawaran:** 8–10%

- Upload media (profil, logo)
- Serve file untuk `<img>`
- Storage lokal atau MinIO/S3
- Metadata object storage di tabel media

---

## 7. UI/UX Shell & Responsif

**Bobot penawaran:** 10–12%

- Admin template (TailAdmin-style) dikustomisasi
- Sidebar permission-filtered, command palette (Ctrl+K)
- Mobile bottom nav, dark/light mode
- Toast, confirm modal, auth modern
- Sign up = hubungi admin WhatsApp

---

## 8. Infrastruktur & DevOps (Kode)

**Bobot penawaran:** 5–8%

- Docker Compose dev + prod
- PostgreSQL, Redis, MinIO
- Config Nginx (local + gateway)
- Alembic migration + seed superadmin
- Logging middleware, health check

---

## 9. Fitur Tidak Aktif (Tidak Dihitung Penuh)

| Item | Status |
|------|--------|
| Chart ApexCharts | Ada di codebase, tidak dipakai |
| Halaman Forbidden terpisah | Tidak di-route |
| QR scan di bottom nav | Di-comment |
| Notification dropdown | Di-comment |
| Self-register form | Diganti WhatsApp |
| Order settings (quota/harga) | Backend only, tanpa UI |
| UserAddressCard | Di-comment |

---

## Selling Points (vs CRUD Biasa)

1. OCR + parsing surat sakit domain-specific  
2. Manipulasi PDF + embed QR (PyMuPDF)  
3. Verifikasi publik + proteksi tanggal lahir  
4. Dual storage (lokal + S3/MinIO)  
5. Dashboard realtime (WebSocket + Redis)  
6. Security hardening (RBAC, rate limit, Turnstile)  
7. Mobile-first admin + halaman verify publik  

---

*Dokumen terkait: [MODUL_OPSIONAL.md](./MODUL_OPSIONAL.md) · [ALOKASI_HARGA.md](./ALOKASI_HARGA.md) · [QUOTATION_PURCHASING_GO.md](./QUOTATION_PURCHASING_GO.md)*
