import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'catboost_db';

// Connect as root to ensure database exists (root has CREATE privilege)
async function ensureDatabaseExists() {
  const rootPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3309,
    user: 'root',
    password: process.env.DB_PASSWORD || 'mysql',  // MYSQL_ROOT_PASSWORD
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
  });

  try {
    await rootPool.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    // Grant privileges to the app user
    await rootPool.execute(`GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${process.env.DB_USER || 'mysql'}'@'%'`);
    await rootPool.execute('FLUSH PRIVILEGES');
    console.log(`Database '${DB_NAME}' ensured with privileges`);
  } catch (error) {
    // Database might already exist, ignore if it's just "already exists"
    if (!error.message.includes('already exists') && !error.message.includes('Access denied')) {
      console.warn('Could not ensure database:', error.message);
    }
  } finally {
    await rootPool.end();
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3309,
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'mysql',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function testConnection() {
  try {
    await ensureDatabaseExists();
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

export async function connectDB() {
  await ensureDatabaseExists();
  return pool;
}

export default pool;