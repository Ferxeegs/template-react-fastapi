# Review Modul Opsional — Purchasing Go

Dokumen ini membantu negosiasi scope dengan klien: fitur **termasuk paket standar**, **opsional (bisa di-cut)**, dan **tidak dihitung**.

---

## Paket Standar (Recommended — Sesuai Codebase Saat Ini)

Semua modul di bawah ini sudah diimplementasi dan menjadi nilai utama penawaran.

| Modul | Termasuk | Alasan |
|-------|----------|--------|
| Core medis (OCR, PDF, QR, verify) | Ya | Produk utama |
| Auth + RBAC + rate limit | Ya | Wajib untuk data medis |
| User & role admin | Ya | Operasional klinik |
| Settings & branding | Ya | White-label klinik |
| Dashboard (tanpa WS) | Ya* | *Lihat opsional WS |
| Media & storage lokal | Ya | Logo, profil |
| UI responsif + mobile nav | Ya | Staff pakai HP |
| Docker + migration + seed | Ya | Serah terima teknis |

---

## Modul Opsional — Bisa Dikurangi untuk Menurunkan Harga

Gunakan tabel ini saat klien minta versi lebih murah.

| Fitur | Potongan estimasi | Dampak jika di-cut |
|-------|-------------------|-------------------|
| **WebSocket dashboard** | −Rp 4–6 juta | Dashboard tidak auto-update; refresh manual |
| **MinIO/S3 storage** | −Rp 3–5 juta | Hanya disk lokal; skala file terbatas |
| **Turnstile (CAPTCHA login)** | −Rp 1–2 juta | Tanpa bot protection di login |
| **Impersonate user** | −Rp 1–2 juta | Support admin lebih manual |
| **3 mode print PDF** (hanya mode 1) | −Rp 2–4 juta | Hanya simpan PDF digital, tanpa print flow |
| **Remember me 30 hari** | −Rp 0,5–1 juta | Login ulang lebih sering |
| **Command palette (Ctrl+K)** | −Rp 0,5–1 juta | Navigasi hanya sidebar |
| **Rate limit verifikasi publik** | −Rp 1–2 juta | Risiko brute-force tanggal lahir |

**Paket hemat contoh:** Core medis + auth RBAC + user admin + UI dasar + storage lokal ≈ **Rp 35–45 juta** (tanpa WS, tanpa MinIO, tanpa Turnstile).

---

## Tidak Dihitung / Out of Scope Default

| Item | Catatan |
|------|---------|
| Deployment production | Add-on terpisah |
| Domain, SSL, VPS bulanan | Klien atau add-on |
| Maintenance bulanan | Kontrak terpisah |
| Training on-site | Add-on Rp 2–5 juta |
| Custom OCR per format RS lain | Add-on per format |
| Integrasi HIS/EMR | Proyek terpisah |
| Chart analytics | Belum ada di UI |
| Self-registration user | Sengaja diganti WhatsApp admin |
| Order/quota settings UI | Belum di-build |

---

## Rekomendasi untuk Klien Klinik Kecil

**Minimum viable (aman):** Core medis + auth RBAC + user admin + verify publik + rate limit  
**Recommended:** Paket standar penuh (sesuai repo saat ini)  
**Premium:** Standar + garansi 6 bulan + training + deployment assist

---

*Lanjut ke alokasi harga: [ALOKASI_HARGA.md](./ALOKASI_HARGA.md)*
