import express from 'express';
import Joi from 'joi';
import pool from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const academicSchema = Joi.object({
  student_id: Joi.number().integer().required(),
  assignment_score: Joi.number().min(0).max(100).required(),
  uts_score: Joi.number().min(0).max(100).required(),
  attendance: Joi.number().min(0).max(100).required(),
  participation: Joi.number().min(0).max(100).required(),
  semester: Joi.string().max(20).required(),
  academic_year: Joi.string().max(10).required()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  student_id: Joi.number().integer(),
  semester: Joi.string().allow(''),
  academic_year: Joi.string().allow('')
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { page, limit, student_id, semester, academic_year } = value;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (student_id) {
      whereClause += ' AND student_id = ?';
      params.push(student_id);
    }
    if (semester) {
      whereClause += ' AND semester = ?';
      params.push(semester);
    }
    if (academic_year) {
      whereClause += ' AND academic_year = ?';
      params.push(academic_year);
    }

    const [records] = await pool.execute(
      `SELECT ar.*, s.name as student_name, s.nis, s.class, s.major
       FROM academic_records ar
       JOIN students s ON ar.student_id = s.id
       ${whereClause} ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM academic_records ar ${whereClause}`,
      params
    );

    res.json({
      data: records,
      pagination: {
        page,
        limit,
        total: total[0].count,
        totalPages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Get academics error:', err);
    res.status(500).json({ error: 'Failed to fetch academic records' });
  }
});

router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const [records] = await pool.execute(
      `SELECT * FROM academic_records WHERE student_id = ? ORDER BY created_at DESC`,
      [req.params.studentId]
    );
    res.json(records);
  } catch (err) {
    console.error('Get student academics error:', err);
    res.status(500).json({ error: 'Failed to fetch student academic records' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = academicSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const [student] = await pool.execute('SELECT id FROM students WHERE id = ?', [value.student_id]);
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO academic_records
       (student_id, assignment_score, uts_score, attendance, participation, semester, academic_year)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [value.student_id, value.assignment_score, value.uts_score, value.attendance, value.participation, value.semester, value.academic_year]
    );

    res.status(201).json({ id: result.insertId, ...value });
  } catch (err) {
    console.error('Create academic record error:', err);
    res.status(500).json({ error: 'Failed to create academic record' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error, value } = academicSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await pool.execute(
      `UPDATE academic_records SET
       student_id = ?, assignment_score = ?, uts_score = ?, attendance = ?, participation = ?, semester = ?, academic_year = ?
       WHERE id = ?`,
      [value.student_id, value.assignment_score, value.uts_score, value.attendance, value.participation, value.semester, value.academic_year, req.params.id]
    );

    res.json({ id: req.params.id, ...value });
  } catch (err) {
    console.error('Update academic record error:', err);
    res.status(500).json({ error: 'Failed to update academic record' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM academic_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'Academic record deleted' });
  } catch (err) {
    console.error('Delete academic record error:', err);
    res.status(500).json({ error: 'Failed to delete academic record' });
  }
});

export default router;