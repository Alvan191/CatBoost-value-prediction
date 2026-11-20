# Prediksi Nilai Akhir dengan CatBoost

Aplikasi Flask menggunakan model CatBoost dan MySQL. Setiap prediksi disimpan ke tabel `predictions`,
dan dashboard memuat riwayat yang tersimpan di database. Folder `backend/` menyediakan migrasi
database Node.js; API prediksi aktif tetap berjalan dari `app.py`.

## Menjalankan aplikasi lokal (Windows)

Persyaratan: Docker Desktop, Node.js 20+, dan Python 3.12+ (diuji dengan Python 3.13).

1. Dari folder proyek, jalankan MySQL:

   ```powershell
   docker compose up -d mysql-db
   ```

2. Jalankan migrasi database:

   ```powershell
   cd backend
   npm install
   npm run db:migrate
   cd ..
   ```

   Migrasi aman dijalankan berulang kali. Untuk database lama, migrasi menambahkan kolom
   `student_name` dan mengubah `student_id` menjadi nullable tanpa menghapus riwayat yang ada.

3. Siapkan dependency Python dan jalankan aplikasi:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe app.py
   ```

4. Buka `http://127.0.0.1:5000`, login (saat ini masih mode mock), lalu pilih **Uji prediksi**.
   Setelah prediksi sukses tersimpan, buka dashboard untuk melihat riwayat database.

MySQL menggunakan nilai default dari `docker-compose.yaml`: host `127.0.0.1`, port `3309`,
database `catboost_db`, user `mysql`, dan password `mysql`. Jika nilainya diubah, atur variabel
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, dan `DB_ROOT_PASSWORD` di
`backend/.env`. Flask dan migrasi membaca konfigurasi tersebut. Pastikan MySQL berstatus `healthy`
(`docker compose ps`) sebelum menjalankan migrasi.

## Skema prediksi

Kolom fitur model disimpan sebagai JSON di `predictions.features_json`:
`nilai_tugas`, `nilai_uts`, `kehadiran`, `keaktifan`, `kelas`, `jurusan`, dan `mata_pelajaran`.
Nilai hasil disimpan di `predicted_score`; nama dari form disimpan di `student_name`.
`student_id` tetap tersedia untuk prediksi yang terhubung ke data siswa lama, tetapi boleh `NULL`
untuk prediksi dari form bebas.

Metrik uji yang tercatat di `Model/meta_model.json`: MAE 2.2802, RMSE 2.8333, dan R² 0.8391.
Metrik tersebut berasal dari data uji pelatihan, bukan jaminan akurasi untuk data baru.
