const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'acpg',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

// ─── Helper: get current academic year ───
async function getCurrentYear() {
  const [rows] = await pool.query('SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1');
  return rows[0] || null;
}

// ═══════════════════════════════════════════
//  ACADEMIC YEARS
// ═══════════════════════════════════════════

app.get('/api/years', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM academic_years ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/years/current', async (_req, res) => {
  try {
    const year = await getCurrentYear();
    if (!year) return res.status(404).json({ error: 'No current year set' });
    res.json(year);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
//  BATCHES
// ═══════════════════════════════════════════

app.get('/api/batches', async (_req, res) => {
  try {
    const year = await getCurrentYear();
    if (!year) return res.json([]);
    const [rows] = await pool.query('SELECT * FROM batches WHERE year_id = ?', [year.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
//  PREFECTS
// ═══════════════════════════════════════════

// Get all active prefects with batch info
app.get('/api/prefects', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.name, p.prefect_id, p.is_active, p.created_at,
             b.name AS batch, b.id AS batch_id,
             ay.year AS academic_year, ay.id AS year_id
      FROM prefects p
      JOIN batches b ON p.batch_id = b.id
      JOIN academic_years ay ON b.year_id = ay.id
      WHERE p.is_active = TRUE
      ORDER BY p.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new prefect
app.post('/api/prefects', async (req, res) => {
  try {
    const { id, name, prefectId, batch } = req.body;
    const year = await getCurrentYear();
    if (!year) return res.status(400).json({ error: 'No current academic year set' });

    // Find the batch_id for the given batch name in the current year
    const [batches] = await pool.query(
      'SELECT id FROM batches WHERE name = ? AND year_id = ?',
      [batch, year.id]
    );
    if (batches.length === 0) return res.status(400).json({ error: `Batch "${batch}" not found for current year` });

    await pool.query(
      'INSERT INTO prefects (id, name, prefect_id, batch_id) VALUES (?, ?, ?, ?)',
      [id, name, prefectId, batches[0].id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Prefect ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete a prefect
app.delete('/api/prefects/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prefects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
//  DUTY RECORDS
// ═══════════════════════════════════════════

// Get duty records for current year
app.get('/api/duties', async (_req, res) => {
  try {
    const year = await getCurrentYear();
    if (!year) return res.json([]);
    const [rows] = await pool.query(
      `SELECT d.*, p.name AS prefect_name, p.prefect_id AS prefect_display_id
       FROM duty_records d
       JOIN prefects p ON d.prefect_id = p.id
       WHERE d.year_id = ?
       ORDER BY d.created_at DESC`,
      [year.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a duty record
app.post('/api/duties', async (req, res) => {
  try {
    const { id, prefectId, dutyType, points, date } = req.body;
    const year = await getCurrentYear();
    if (!year) return res.status(400).json({ error: 'No current academic year set' });

    await pool.query(
      'INSERT INTO duty_records (id, prefect_id, duty_type, points, date, year_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, prefectId, dutyType, points, date, year.id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a duty record
app.delete('/api/duties/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM duty_records WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a duty record
app.put('/api/duties/:id', async (req, res) => {
  try {
    const { dutyType, points, date } = req.body;
    await pool.query(
      'UPDATE duty_records SET duty_type = ?, points = ?, date = ? WHERE id = ?',
      [dutyType, points, date, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
//  BULK PROMOTION
// ═══════════════════════════════════════════

app.post('/api/promote', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { newYear } = req.body; // e.g. "2026/2027"
    if (!newYear) return res.status(400).json({ error: 'newYear is required (e.g. "2026/2027")' });

    // 1. Get current year
    const [currentYears] = await conn.query('SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1');
    if (currentYears.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'No current academic year set' });
    }
    const currentYearId = currentYears[0].id;

    // 2. Create new academic year
    const [insertResult] = await conn.query(
      'INSERT INTO academic_years (year, is_current) VALUES (?, FALSE)',
      [newYear]
    );
    const newYearId = insertResult.insertId;

    // 3. Create batches for the new year
    await conn.query('INSERT INTO batches (name, year_id) VALUES (?, ?), (?, ?), (?, ?)', [
      'Trainee', newYearId, 'Assistant', newYearId, 'Junior', newYearId,
    ]);

    // 4. Get new batch IDs
    const [newBatches] = await conn.query('SELECT * FROM batches WHERE year_id = ?', [newYearId]);
    const newBatchMap = {};
    newBatches.forEach(b => { newBatchMap[b.name] = b.id; });

    // 5. Get current batch IDs
    const [currentBatches] = await conn.query('SELECT * FROM batches WHERE year_id = ?', [currentYearId]);
    const currentBatchMap = {};
    currentBatches.forEach(b => { currentBatchMap[b.name] = b.id; });

    // 6. Graduate Juniors (set is_active = FALSE)
    if (currentBatchMap['Junior']) {
      await conn.query('UPDATE prefects SET is_active = FALSE WHERE batch_id = ?', [currentBatchMap['Junior']]);
    }

    // 7. Promote Assistants → Junior (new year)
    if (currentBatchMap['Assistant'] && newBatchMap['Junior']) {
      await conn.query('UPDATE prefects SET batch_id = ? WHERE batch_id = ? AND is_active = TRUE', [
        newBatchMap['Junior'], currentBatchMap['Assistant'],
      ]);
    }

    // 8. Promote Trainees → Assistant (new year)
    if (currentBatchMap['Trainee'] && newBatchMap['Assistant']) {
      await conn.query('UPDATE prefects SET batch_id = ? WHERE batch_id = ? AND is_active = TRUE', [
        newBatchMap['Assistant'], currentBatchMap['Trainee'],
      ]);
    }

    // 9. Switch current year
    await conn.query('UPDATE academic_years SET is_current = FALSE WHERE id = ?', [currentYearId]);
    await conn.query('UPDATE academic_years SET is_current = TRUE WHERE id = ?', [newYearId]);

    await conn.commit();

    res.json({
      success: true,
      message: `Promoted to ${newYear}. Juniors graduated, Assistants→Junior, Trainees→Assistant. Points preserved under old year.`,
      newYearId,
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Academic year "${req.body.newYear}" already exists` });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`ACPG API server running on http://localhost:${PORT}`);
});
