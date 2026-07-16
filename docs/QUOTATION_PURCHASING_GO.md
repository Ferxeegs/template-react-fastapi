# Penawaran Harga — Purchasing Go (Manajemen Pengadaan Barang)

**Kepada:** [Nama Klien / Perusahaan]  
**Dari:** [Nama Penyedia / Perusahaan]  
**Tanggal:** [DD Month YYYY]  
**Berlaku hingga:** [30 hari dari tanggal]

---

## Ringkasan

Pengembangan **Purchasing Go — Sistem Manajemen Pengadaan Barang** — dari permintaan barang, persetujuan, pembelian, hingga penerimaan dan pelacakan dokumen pengadaan.

| Item | Detail |
|------|--------|
| **Paket yang ditawarkan** | Standard — Rp **58.000.000** |
| **Alternatif** | Essential Rp 45 jt · Premium Rp 70 jt |
| **Estimasi pengerjaan** | ±10–14 minggu kalender |
| **Metode pembayaran** | 40% DP · 40% UAT · 20% serah terima |

---

## Scope Development (Termasuk)

### A. Modul Pengadaan (Core)
- Permintaan barang (PR) dan alur persetujuan
- Purchase order (PO) dan pelacakan status
- Penerimaan barang (GR) dan rekonsiliasi
- Manajemen vendor / supplier
- Upload & arsip dokumen pengadaan (PDF, lampiran)

### B. Keamanan & Akses
- Login aman (JWT + HttpOnly cookie, refresh session)
- Role & permission (RBAC), superadmin
- Rate limit login, session timeout 30 menit
- Cloudflare Turnstile (opsional, via konfigurasi)
- Impersonate user (superadmin support)

### C. Admin Panel
- Manajemen user & role
- Settings branding (logo, favicon, nama perusahaan)
- Dashboard pengadaan + update realtime (WebSocket)
- Profil pengguna & ganti password
- UI responsif (desktop + mobile)

### D. Teknis (Kode & Konfigurasi)
- Backend FastAPI + PostgreSQL + Redis
- Storage file (lokal + MinIO/S3-ready)
- Docker Compose (dev & prod profile)
- Database migration + seed akun superadmin
- Konfigurasi Nginx (file template, belum deploy live)

---

## Tidak Termasuk (Exclude)

- Sewa VPS / cloud / domain
- Deployment & go-live production
- SSL, DNS, Cloudflare setup di server klien
- Biaya bulanan hosting & backup
- Maintenance setelah masa garansi
- Integrasi ERP / akuntansi existing
- Custom workflow di luar scope standar

---

## Add-On Opsional

| Add-on | Harga |
|--------|-------|
| Deployment production + SSL | Rp 5.000.000 |
| Training admin (2 sesi online) | Rp 3.000.000 |
| Garansi bug extended 6 bulan | Rp 5.000.000 |
| Paket Premium (dokumentasi + training + garansi) | **Rp 70.000.000** total |
| Paket Essential (fitur dikurangi, lihat MODUL_OPSIONAL.md) | **Rp 45.000.000** total |

---

## Deliverable Serah Terima

1. Source code backend + frontend (repository)
2. File environment example (`.env.example`)
3. Docker Compose untuk development
4. Akun superadmin awal (via seed)
5. Panduan singkat menjalankan lokal (README)
6. Demo UAT di environment staging (jika disepakati)

---

## Asumsi & Catatan

- Alur persetujuan mengikuti kebijakan klien; penyesuaian ekstra di luar scope standar
- Klien menyediakan contoh dokumen pengadaan untuk uji
- Konten branding (logo, teks) disediakan klien
- Registrasi user baru via admin (bukan self-register publik)

---

## Persetujuan

| | Nama | Tanda tangan | Tanggal |
|---|------|--------------|---------|
| **Klien** | | | |
| **Penyedia** | | | |

---

*Lampiran: [PRICING_DAFTAR_FITUR.md](./PRICING_DAFTAR_FITUR.md) · [ALOKASI_HARGA.md](./ALOKASI_HARGA.md) · [MODUL_OPSIONAL.md](./MODUL_OPSIONAL.md)*
