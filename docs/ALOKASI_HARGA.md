# Alokasi Harga Development — Purchasing Go

**Pasaran referensi:** Semarang / Jawa Tengah  
**Scope:** Development only (exclude deployment)  
**Mata uang:** Rupiah (IDR)

---

## Tiga Tier Paket

| Tier | Target | Total development | Catatan |
|------|--------|-------------------|---------|
| **Essential** | Klinik kecil, budget ketat | **Rp 45.000.000** | Tanpa WebSocket, MinIO opsional lokal-only |
| **Standard** | Rekomendasi (sesuai codebase) | **Rp 58.000.000** | Fitur lengkap seperti repo saat ini |
| **Premium** | Agency + dokumentasi + garansi | **Rp 70.000.000** | Standard + buffer QA & handover formal |

---

## Alokasi Detail — Paket Standard (Rp 58.000.000)

| No | Modul | Bobot | Nilai (IDR) | Deliverable utama |
|----|-------|-------|-------------|-------------------|
| 1 | Core medis (OCR/PDF/QR/verify) | 38% | Rp 22.040.000 | Upload, OCR, stamp QR, verify publik, CRUD dokumen |
| 2 | Auth & keamanan | 17% | Rp 9.860.000 | JWT, RBAC, rate limit, Turnstile, session timeout |
| 3 | User & role admin | 16% | Rp 9.280.000 | CRUD user, role, permission, impersonate |
| 4 | Dashboard + WebSocket | 9% | Rp 5.220.000 | Widget, list realtime, live indicator |
| 5 | Settings & branding | 9% | Rp 5.220.000 | General + appearance, logo/favicon |
| 6 | Media & storage | 8% | Rp 4.640.000 | Upload profil/logo, MinIO + lokal |
| 7 | UI shell & responsif | 10% | Rp 5.800.000 | Sidebar, mobile nav, dark mode, auth UI |
| 8 | Infra kode (Docker, seed, nginx) | 6% | Rp 3.480.000 | Compose, migration, superadmin seed, config nginx |
| | **Total** | **100%** | **Rp 58.000.000** | |

---

## Alokasi Detail — Paket Essential (Rp 45.000.000)

| Modul | Standard | Essential | Selisih |
|-------|----------|-----------|---------|
| Core medis | Rp 22.040.000 | Rp 20.000.000 | OCR/PDF tetap; 3 mode print → mode 1 saja |
| Auth & keamanan | Rp 9.860.000 | Rp 8.500.000 | Tanpa Turnstile |
| User & role | Rp 9.280.000 | Rp 8.000.000 | Tanpa impersonate |
| Dashboard | Rp 5.220.000 | Rp 2.500.000 | Tanpa WebSocket |
| Settings | Rp 5.220.000 | Rp 4.500.000 | Branding dasar |
| Media & storage | Rp 4.640.000 | Rp 3.500.000 | Lokal only |
| UI shell | Rp 5.800.000 | Rp 5.000.000 | — |
| Infra | Rp 3.480.000 | Rp 3.000.000 | — |
| **Total** | Rp 58.000.000 | **Rp 45.000.000** | |

---

## Alokasi Detail — Paket Premium (Rp 70.000.000)

| Komponen | Nilai (IDR) |
|----------|-------------|
| Paket Standard | Rp 58.000.000 |
| Dokumentasi user + teknis | Rp 4.000.000 |
| Training admin (2 sesi online) | Rp 3.000.000 |
| Garansi bug 6 bulan | Rp 5.000.000 |
| **Total Premium** | **Rp 70.000.000** |

---

## Estimasi Jam vs Rate (Referensi Internal)

| Paket | Jam estimasi | Rate efektif/jam |
|-------|--------------|------------------|
| Essential | ~320 jam | ~Rp 140.625/jam |
| Standard | ~400 jam | ~Rp 145.000/jam |
| Premium | ~450 jam + support | ~Rp 155.000/jam |

*Rate di atas ilustrasi untuk freelancer mid-level Semarang; sesuaikan profil tim Anda.*

---

## Add-On (Di Luar Paket Development)

| Add-on | Kisaran harga |
|--------|---------------|
| Deployment production (VPS + SSL + DNS) | Rp 3.000.000 – 8.000.000 (one-time) |
| Maintenance bulanan | Rp 2.000.000 – 5.000.000/bulan |
| Custom OCR format surat spesifik | Rp 5.000.000 – 15.000.000/format |
| Integrasi HIS/EMR | Negosiasi proyek terpisah |
| Training on-site Semarang | Rp 3.000.000 – 5.000.000 |

---

*Quotation siap kirim ke klien: [QUOTATION_PURCHASING_GO.md](./QUOTATION_PURCHASING_GO.md)*
