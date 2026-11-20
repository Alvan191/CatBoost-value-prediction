import express from 'express';
import Joi from 'joi';
import { PythonShell } from 'python-shell';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = path.join(__dirname, '../../ml/predict.py');

const predictSchema = Joi.object({
  student_id: Joi.number().integer().required(),
  assignment_score: Joi.number().min(0).max(100).required(),
  uts_score: Joi.number().min(0).max(100).required(),
  attendance: Joi.number().min(0).max(100).required(),
  participation: Joi.number().min(0).max(100).required(),
  class: Joi.string().max(20).required(),
  major: Joi.string().max(50).required()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  student_id: Joi.number().integer()
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { page, limit, student_id } = value;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (student_id) {
      whereClause += ' AND p.student_id = ?';
      params.push(student_id);
    }

    const [predictions] = await pool.execute(
      `SELECT p.*, s.name as student_name, s.nis, s.class, s.major
       FROM predictions p
       JOIN students s ON p.student_id = s.id
       ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM predictions p ${whereClause}`,
      params
    );

    res.json({
      data: predictions,
      pagination: {
        page,
        limit,
        total: total[0].count,
        totalPages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Get predictions error:', err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

router.post('/predict', authenticateToken, async (req, res) => {
  try {
    const { error, value } = predictSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const features = {
      assignment_score: value.assignment_score,
      uts_score: value.uts_score,
      attendance: value.attendance,
      participation: value.participation,
      class: value.class,
      major: value.major
    };

    const predictedScore = await runPrediction(features);

    const featuresJson = JSON.stringify(features);
    const [result] = await pool.execute(
      `INSERT INTO predictions (student_id, predicted_score, features_json, model_version)
       VALUES (?, ?, ?, '1.0')`,
      [value.student_id, predictedScore, featuresJson]
    );

    res.json({
      id: result.insertId,
      student_id: value.student_id,
      predicted_score: predictedScore,
      features,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: 'Prediction failed', details: err.message });
  }
});

router.post('/batch-predict', authenticateToken, async (req, res) => {
  try {
    const { student_ids } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'student_ids array required' });
    }

    const placeholders = student_ids.map(() => '?').join(',');
    const [records] = await pool.execute(
      `SELECT ar.*, s.class, s.major, s.name
       FROM academic_records ar
       JOIN students s ON ar.student_id = s.id
       WHERE ar.student_id IN (${placeholders})
       ORDER BY ar.created_at DESC`,
      student_ids
    );

    const latestRecords = {};
    for (const record of records) {
      if (!latestRecords[record.student_id]) {
        latestRecords[record.student_id] = record;
      }
    }

    const results = [];
    for (const [studentId, record] of Object.entries(latestRecords)) {
      const features = {
        assignment_score: record.assignment_score,
        uts_score: record.uts_score,
        attendance: record.attendance,
        participation: record.participation,
        class: record.class,
        major: record.major
      };

      const predictedScore = await runPrediction(features);
      const featuresJson = JSON.stringify(features);

      const [result] = await pool.execute(
        `INSERT INTO predictions (student_id, predicted_score, features_json, model_version)
         VALUES (?, ?, ?, '1.0')`,
        [studentId, predictedScore, featuresJson]
      );

      results.push({
        id: result.insertId,
        student_id: parseInt(studentId),
        student_name: record.name,
        predicted_score: predictedScore,
        features
      });
    }

    res.json({ predictions: results });
  } catch (err) {
    console.error('Batch prediction error:', err);
    res.status(500).json({ error: 'Batch prediction failed', details: err.message });
  }
});

function runPrediction(features) {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'text',
      pythonOptions: ['-u'],
      scriptPath: path.join(__dirname, '../../ml'),
      args: [JSON.stringify(features)]
    };

    PythonShell.run('predict.py', options, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const output = JSON.parse(results[results.length - 1]);
        resolve(output.predicted_score);
      } catch (parseErr) {
        reject(new Error('Invalid prediction output'));
      }
    });
  });
}

export default router;