# CatBoost Academic Value Prediction

Aplikasi prediksi nilai akhir siswa menggunakan algoritma CatBoost dengan frontend HTML/JS dan backend Node.js/Express.

## Struktur Proyek

```
CatBoost-value-prediction/
├── backend/                 # Node.js Backend API
│   ├── src/
│   │   ├── server.js        # Entry point Express server
│   │   ├── db/
│   │   │   ├── connection.js    # MySQL connection pool
│   │   │   ├── migrate.js       # Database migrations
│   │   │   └── seed.js          # Sample data seeder
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT authentication
│   │   └── routes/
│   │       ├── auth.js          # Login/Register endpoints
│   │       ├── students.js      # Student CRUD
│   │       ├── academics.js     # Academic records CRUD
│   │       └── predictions.js   # Prediction endpoints
│   ├── ml/
│   │   ├── predict.py           # Python prediction script
│   │   └── train.py             # Model training script
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── html/
│   └── dashboard.html       # Dashboard page
├── css/
│   ├── login.css
│   └── dashboard.css
├── js/
│   ├── login.js
│   └── dashboard.js
├── login.html               # Login page
├── docker-compose.yaml      # Docker services
└── README.md
```

## Fitur

- **Autentikasi JWT** - Login/register dengan role admin/teacher
- **Manajemen Siswa** - CRUD data siswa (NIS, nama, kelas, jurusan)
- **Data Akademik** - Input nilai tugas, UTS, kehadiran, keaktifan
- **Prediksi CatBoost** - Prediksi nilai akhir via Python CatBoost model
- **Dashboard** - Statistik dan riwayat prediksi

## Quick Start

### 1. Dengan Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate

# Seed sample data
docker-compose exec backend npm run db:seed

# Train ML model (optional, uses fallback if not trained)
docker-compose exec backend python ml/train.py
```

### 2. Manual Setup

**Prerequisites:**
- Node.js 20+
- MySQL 8.0 (port 3309)
- Python 3.10+ dengan catboost, joblib, scikit-learn, pandas, numpy

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
python ml/train.py
npm run dev

# Frontend (serve with any static server)
# e.g. VS Code Live Server, or:
npx serve .
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (admin only)
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/students` - List students (pagination, search, filter)
- `GET /api/students/:id` - Get student
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Academics
- `GET /api/academics` - List academic records
- `GET /api/academics/student/:studentId` - Get student's records
- `POST /api/academics` - Create record
- `PUT /api/academics/:id` - Update record
- `DELETE /api/academics/:id` - Delete record

### Predictions
- `GET /api/predictions` - List predictions
- `POST /api/predictions/predict` - Single prediction
- `POST /api/predictions/batch-predict` - Batch prediction

## ML Model

Model CatBoost dilatih dengan fitur:
1. Nilai Tugas (assignment_score)
2. Nilai UTS (uts_score)
3. Kehadiran (attendance)
4. Keaktifan (participation)
5. Kelas (class - categorical)
6. Jurusan (major - categorical)

Target: Nilai Akhir (final_score)

Jika model belum dilatih, sistem menggunakan fallback heuristic berbasis weighted average.

## Demo Credentials

- Username: `admin`
- Password: `password123`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend port |
| FRONTEND_URL | http://localhost:5500 | CORS origin |
| DB_HOST | localhost | MySQL host |
| DB_PORT | 3309 | MySQL port |
| DB_USER | mysql | MySQL user |
| DB_PASSWORD | mysql | MySQL password |
| DB_NAME | catboost_db | Database name |
| JWT_SECRET | - | JWT signing secret |

## Development

```bash
# Backend with auto-reload
cd backend && npm run dev

# Run migrations
npm run db:migrate

# Seed data
npm run db:seed

# Train model
python ml/train.py
```

## Production Notes

- Ganti `JWT_SECRET` di production
- Gunakan HTTPS
- Set `NODE_ENV=production`
- Konfigurasi MySQL yang aman
- Gunakan reverse proxy (nginx) di depan backend