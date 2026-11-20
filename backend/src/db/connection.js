import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3309,
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'mysql',
  database: process.env.DB_NAME || 'catboost_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;