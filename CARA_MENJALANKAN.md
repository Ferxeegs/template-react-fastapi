# Panduan Menjalankan Proyek Purchasing Go

Proyek **Purchasing Go** — aplikasi manajemen pengadaan barang — terdiri dari **FastAPI** (Backend) dan **React + Vite** (Frontend) yang terintegrasi dengan **PostgreSQL** dan **Redis**.

## 🛠️ Langkah Cepat (Docker)

1. **Persiapan .env**
   ```powershell
   cp .env.example .env
   ```

2. **Buat Network Docker**
   ```powershell
   docker network create app-bridge
   ```

3. **Jalankan Service**
   ```powershell
   docker-compose --profile dev up -d --build
   ```

## 🌐 Alamat Akses
- **Frontend Gateway:** http://localhost:81
- **Backend API Docs:** http://localhost:8000/docs
- **Adminer (Database UI):** http://localhost:8080

## 🔑 Akun Default
- **Username:** `superadmin`
- **Password:** `12341234`

## 📂 Struktur Penting
- `/backend`: Source code FastAPI & Migrasi Alembic.
- `/frontend`: Source code React (TypeScript).
- `/nginx`: Konfigurasi gateway/proxy.
