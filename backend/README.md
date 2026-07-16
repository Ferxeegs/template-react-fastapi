# App Template Backend API

Backend API boilerplate menggunakan FastAPI, SQLAlchemy, dan MySQL/PostgreSQL.

## 🚀 Fitur

- ✅ **FastAPI**: RESTful API modern dan performa tinggi.
- ✅ **Authentication & Authorization**: JWT-based auth dengan Refresh Token support.
- ✅ **RBAC (Role-Based Access Control)**: Manajemen Role dan Permission yang fleksibel.
- ✅ **Media Management**: Upload, serve, dan manajemen file (gambar) terintegrasi.
- ✅ **System Settings**: Konfigurasi aplikasi yang dapat dikelola melalui API dan database.
- ✅ **Database Migrations**: Versi skema database menggunakan Alembic.
- ✅ **Structured Logging**: Logging middleware untuk tracking request dan error.
- ✅ **Pydantic V2**: Validasi data yang ketat dan efisien.
- ✅ **CORS Configuration**: Siap untuk integrasi dengan berbagai origin.
- ✅ **Exception Handling**: Global exception handler untuk response error yang konsisten.
- ✅ **API Documentation**: Swagger UI (`/docs`) dan ReDoc (`/redoc`) otomatis.

## 📋 Prerequisites

- Python 3.10+
- PostgreSQL 12+ (atau MySQL 8+)
- Docker & Docker Compose (opsional)

## 🛠️ Setup Development

### 1. Clone dan Install Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Setup Environment Variables

```bash
# Copy file contoh
cp .env.example .env
```

**PENTING**: Edit file `.env` dan isi dengan nilai yang sesuai. Jangan commit file `.env` ke repository!

Konfigurasi penting yang harus diisi:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: koneksi MySQL (container eksternal di jaringan `app-bridge`, default host `mysql-container`)
- `DATABASE_URL`: opsional; jika kosong, URL `mysql+pymysql://...` dibangun otomatis dari variabel di atas
- `SECRET_KEY`: Secret key untuk JWT (generate dengan: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `BACKEND_CORS_ORIGINS`: URL frontend yang diizinkan (format JSON array)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Jika menggunakan Docker Compose
- `INIT_ADMIN_*`: Credentials untuk admin user pertama (opsional, ada default)

### 3. Setup Database

#### Menggunakan Docker Compose (Recommended)

```bash
docker-compose up -d db
```

#### Manual Setup

Buat database MySQL (jika belum ada):
```sql
CREATE DATABASE db_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Database Migrations

```bash
# Apply migrations ke database
alembic upgrade head
```

### 5. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server akan berjalan secara default di `http://localhost:8000`. Dokumentasi Swagger dapat diakses di `/docs`.

## 🐳 Docker Setup

File Docker konfigurasi berada di root project directory.

```bash
# Dari root directory
docker-compose up -d
```

## 📁 Struktur Project

```
backend/
├── alembic/              # Database migrations
│   └── versions/         # Migration files
├── app/
│   ├── api/              # API routes
│   │   ├── v1/           # API version 1
│   │   │   └── endpoints/# Endpoint routers (auth, users, media, roles, settings)
│   │   └── deps.py       # API dependencies (database, authentication)
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings (Pydantic Settings)
│   │   ├── security.py   # JWT & Password hashing
│   │   ├── exceptions.py # Custom error classes
│   │   └── logging_config.py # Logging configuration
│   ├── db/               # Database management
│   │   ├── base_class.py # SQLAlchemy base model
│   │   └── session.py    # Database connection setup
│   ├── middleware/       # Custom middleware (logging, etc)
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic models (Request/Response)
│   ├── services/         # Business logic layer
│   └── main.py           # FastAPI entry point
├── logs/                 # Folder log aplikasi
├── scripts/              # Utility scripts
├── .env.example          # Template environment variables
├── alembic.ini           # Configuration Alembic
├── requirements.txt      # Daftar dependencies Python
└── README.md             # File dokumentasi ini
```

## 🔐 Authentication

API menggunakan JWT (JSON Web Tokens) untuk authentication.

### Register User

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "password123",
  "firstname": "Admin",
  "lastname": "User"
}
```

### Login

Mendukung login menggunakan `username` atau `email`.

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123",
  "remember_me": true
}
```

Response akan berisi `access_token` yang digunakan untuk authenticated requests.

### Authenticated Requests

```bash
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

## 🗄️ Database Migrations

### Create Migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
alembic upgrade head
```

### Rollback Migration

```bash
alembic downgrade -1
```

### View Migration History

```bash
alembic history
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html
```

## 📝 Code Quality

```bash
# Format code
black app/

# Lint code
ruff check app/

# Type checking
mypy app/
```

## 🔧 Configuration

Semua konfigurasi dilakukan melalui environment variables di file `.env`. Lihat `.env.example` untuk daftar lengkap variabel yang tersedia.


