import express from 'express';
import Joi from 'joi';
import pool from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const studentSchema = Joi.object({
  nis: Joi.string().max(20).required(),
  name: Joi.string().max(100).required(),
  class: Joi.string().max(20).required(),
  major: Joi.string().max(50).required()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  class: Joi.string().allow(''),
  major: Joi.string().allow('')
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { page, limit, search, class: classFilter, major } = value;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR nis LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (classFilter) {
      whereClause += ' AND class = ?';
      params.push(classFilter);
    }
    if (major) {
      whereClause += ' AND major = ?';
      params.push(major);
    }

    const [students] = await pool.execute(
      `SELECT * FROM students ${whereClause} ORDER BY name LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [total] = await pool.execute(
      `SELECT COUNT(*) as count FROM students ${whereClause}`,
      params
    );

    res.json({
      data: students,
      pagination: {
        page,
        limit,
        total: total[0].count,
        totalPages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.params.id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(students[0]);
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = studentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const [existing] = await pool.execute(
      'SELECT id FROM students WHERE nis = ?',
      [value.nis]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'NIS already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO students (nis, name, class, major) VALUES (?, ?, ?, ?)',
      [value.nis, value.name, value.class, value.major]
    );

    res.status(201).json({ id: result.insertId, ...value });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error, value } = studentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const [existing] = await pool.execute(
      'SELECT id FROM students WHERE nis = ? AND id != ?',
      [value.nis, req.params.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'NIS already exists' });
    }

    await pool.execute(
      'UPDATE students SET nis = ?, name = ?, class = ?, major = ? WHERE id = ?',
      [value.nis, value.name, value.class, value.major, req.params.id]
    );

    res.json({ id: req.params.id, ...value });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;