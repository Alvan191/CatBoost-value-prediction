import pool from './connection.js';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const students = [
  { nis: '2024001', name: 'Ahmad Fauzi', class: 'XII IPA 1', major: 'IPA' },
  { nis: '2024002', name: 'Siti Nurhaliza', class: 'XII IPA 1', major: 'IPA' },
  { nis: '2024003', name: 'Budi Santoso', class: 'XII IPA 2', major: 'IPA' },
  { nis: '2024004', name: 'Dewi Sartika', class: 'XII IPS 1', major: 'IPS' },
  { nis: '2024005', name: 'Rizki Pratama', class: 'XII IPS 1', major: 'IPS' },
  { nis: '2024006', name: 'Maya Indah', class: 'XII IPA 3', major: 'IPA' },
  { nis: '2024007', name: 'Andi Wijaya', class: 'XI IPA 1', major: 'IPA' },
  { nis: '2024008', name: 'Rina Kusuma', class: 'XI IPS 2', major: 'IPS' },
  { nis: '2024009', name: 'Doni Setiawan', class: 'X IPA 2', major: 'IPA' },
  { nis: '2024010', name: 'Lestari Putri', class: 'X IPS 1', major: 'IPS' }
];

const academicRecords = [
  { nis: '2024001', assignment: 85, uts: 80, attendance: 90, participation: 88, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024002', assignment: 90, uts: 88, attendance: 95, participation: 92, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024003', assignment: 78, uts: 75, attendance: 85, participation: 80, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024004', assignment: 82, uts: 79, attendance: 88, participation: 85, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024005', assignment: 75, uts: 72, attendance: 80, participation: 78, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024006', assignment: 88, uts: 85, attendance: 92, participation: 90, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024007', assignment: 80, uts: 78, attendance: 87, participation: 83, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024008', assignment: 77, uts: 74, attendance: 82, participation: 79, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024009', assignment: 83, uts: 81, attendance: 89, participation: 86, semester: 'Ganjil', year: '2024/2025' },
  { nis: '2024010', assignment: 79, uts: 76, attendance: 84, participation: 81, semester: 'Ganjil', year: '2024/2025' }
];

async function seed() {
  const connection = await pool.getConnection();
  try {
    console.log('Seeding database...');

    const passwordHash = await bcrypt.hash('password123', 10);
    await connection.execute(
      'INSERT IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['admin', passwordHash, 'admin']
    );
    console.log('Admin user created (username: admin, password: password123)');

    for (const student of students) {
      await connection.execute(
        'INSERT IGNORE INTO students (nis, name, class, major) VALUES (?, ?, ?, ?)',
        [student.nis, student.name, student.class, student.major]
      );
    }
    console.log(`${students.length} students seeded`);

    for (const record of academicRecords) {
      const [student] = await connection.execute('SELECT id FROM students WHERE nis = ?', [record.nis]);
      if (student.length > 0) {
        await connection.execute(
          `INSERT IGNORE INTO academic_records
           (student_id, assignment_score, uts_score, attendance, participation, semester, academic_year)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [student[0].id, record.assignment, record.uts, record.attendance, record.participation, record.semester, record.year]
        );
      }
    }
    console.log(`${academicRecords.length} academic records seeded`);

    console.log('Seeding completed!');
  } finally {
    connection.release();
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await seed();
  process.exit(0);
}