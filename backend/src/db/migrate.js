import pool from './connection.js';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher') DEFAULT 'teacher',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nis VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    class VARCHAR(20) NOT NULL,
    major VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS academic_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    assignment_score DECIMAL(5,2) NOT NULL,
    uts_score DECIMAL(5,2) NOT NULL,
    attendance DECIMAL(5,2) NOT NULL,
    participation DECIMAL(5,2) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NULL,
    student_name VARCHAR(100) NULL,
    predicted_score DECIMAL(5,2) NOT NULL,
    actual_score DECIMAL(5,2) NULL,
    features_json JSON NOT NULL,
    model_version VARCHAR(50) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`
];

export async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    for (const migration of migrations) {
      await connection.execute(migration);
    }

    const [studentIdColumns] = await connection.execute(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'predictions'
       AND COLUMN_NAME = 'student_id'`
    );
    if (studentIdColumns.length > 0 && studentIdColumns[0].IS_NULLABLE === 'NO') {
      await connection.execute('ALTER TABLE predictions MODIFY COLUMN student_id INT NULL');
    }

    const [studentNameColumns] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'predictions'
       AND COLUMN_NAME = 'student_name'`
    );
    if (studentNameColumns.length === 0) {
      await connection.execute(
        'ALTER TABLE predictions ADD COLUMN student_name VARCHAR(100) NULL AFTER student_id'
      );
    }

    console.log('Migrations completed successfully');
  } finally {
    connection.release();
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runMigrations();
  process.exit(0);
}