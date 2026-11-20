import json
import math
import os
from pathlib import Path

import mysql.connector
import pandas as pd
from catboost import CatBoostRegressor
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request

BASE = Path(__file__).resolve().parent
WEB_DIR = BASE / "CatBoost-value-prediction"
MODEL_DIR = BASE / "Model"
load_dotenv(BASE / "backend" / ".env")

# Folder web disajikan langsung oleh Flask, jadi halaman dan API satu alamat (tanpa CORS)
app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")

model = CatBoostRegressor()
model.load_model(str(MODEL_DIR / "model_catboost_nilai_akhir.cbm"))
with open(MODEL_DIR / "meta_model.json", encoding="utf-8") as f:
    META = json.load(f)

FITUR = META["fitur"]                      # urutan kolom harus sama dengan saat pelatihan
FITUR_NUMERIK = ["nilai_tugas", "nilai_uts", "kehadiran", "keaktifan"]
FITUR_KATEGORIKAL = META["fitur_kategorikal"]
MAE_UJI = META["metrik_uji"]["MAE"]
MODEL_VERSION = "1.0"


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3309")),
        user=os.getenv("DB_USER", "mysql"),
        password=os.getenv("DB_PASSWORD", "mysql"),
        database=os.getenv("DB_NAME", "catboost_db"),
    )


def save_prediction(student_name, predicted_score, features):
    connection = get_db_connection()
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute(
            """INSERT INTO predictions
               (student_id, student_name, predicted_score, features_json, model_version)
               VALUES (NULL, %s, %s, %s, %s)""",
            (
                student_name or None,
                predicted_score,
                json.dumps(features, ensure_ascii=False),
                MODEL_VERSION,
            ),
        )
        connection.commit()
        return cursor.lastrowid
    except mysql.connector.Error:
        connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        connection.close()


@app.get("/")
def index():
    return redirect("/login.html")


@app.post("/api/predict")
def predict():
    data = request.get_json(silent=True) or {}
    baris = {}
    student_name = " ".join(str(data.get("nama", "")).split())
    if len(student_name) > 100:
        return jsonify(error="nama maksimal 100 karakter"), 400

    for k in FITUR_NUMERIK:
        try:
            v = float(str(data.get(k, "")).replace(",", "."))
        except ValueError:
            return jsonify(error=f"{k} harus berupa angka"), 400
        if not math.isfinite(v) or not 0 <= v <= 100:
            return jsonify(error=f"{k} harus di antara 0 dan 100"), 400
        baris[k] = v

    for k in FITUR_KATEGORIKAL:
        v = " ".join(str(data.get(k, "")).split())
        if not v:
            return jsonify(error=f"{k} wajib diisi"), 400
        # samakan dengan pembersihan saat pelatihan
        baris[k] = v.title() if k == "mata_pelajaran" else v.upper()

    X = pd.DataFrame([baris])[FITUR]
    hasil = float(min(max(model.predict(X)[0], 0), 100))
    hasil = round(hasil, 1)

    try:
        prediction_id = save_prediction(student_name, hasil, baris)
    except mysql.connector.Error:
        app.logger.exception("Failed to save prediction")
        return jsonify(
            error="Prediksi tidak tersimpan. Pastikan MySQL aktif dan migrasi database sudah dijalankan."
        ), 503

    return jsonify(
        id=prediction_id,
        prediksi=hasil,
        mae=MAE_UJI,
        nama=student_name or "-",
        input=baris,
    )


@app.get("/api/predictions")
def get_predictions():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS total FROM predictions")
        total = cursor.fetchone()["total"]
        cursor.execute(
            """SELECT COALESCE(NULLIF(p.student_name, ''), s.name, '-') AS student_name,
                      p.predicted_score, p.created_at, p.features_json
               FROM predictions p
               LEFT JOIN students s ON s.id = p.student_id
               ORDER BY p.created_at DESC, p.id DESC
               LIMIT 50"""
        )
        predictions = cursor.fetchall()
        for prediction in predictions:
            prediction["predicted_score"] = float(prediction["predicted_score"])
            prediction["created_at"] = prediction["created_at"].isoformat()
            features = prediction.pop("features_json")
            prediction["features"] = json.loads(features) if isinstance(features, str) else features
        return jsonify(total=total, data=predictions)
    except mysql.connector.Error:
        app.logger.exception("Failed to fetch prediction history")
        return jsonify(
            error="Riwayat prediksi tidak dapat dimuat. Pastikan MySQL aktif dan migrasi database sudah dijalankan."
        ), 503
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    app.run(debug=True, port=5000)

## cara jalankan: python app.py di terminal, lalu buka http://127.0.0.1:5000/login.html di browser

## pip install flask catboost pandas
## python app.py