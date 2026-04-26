const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'acpg',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

// ═══════════════════════════════════════════
//  AUTH — hardcoded credentials + token store
// ═══════════════════════════════════════════

const USERS = [
  { username: 'admin', password: 'admin123' },
];

// In-memory token store
const validTokens = new Set();

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  validTokens.add(token);

  res.json({
    token,
    username: user.username,
  });
});

app.post('/api/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  validTokens.delete(token);
  res.json({ success: true });
});

// Auth middleware
function authMiddleware(req, res, next) {
  if (req.path === '/api/login') return next();

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

app.use('/api', authMiddleware);

// ─── Helpers ──────────────────────────────

async function getCurrentYear() {
  const [rows] = await pool.query(
    'SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1'
  );
  return rows[0] || null;
}

async function getYearById(yearId) {
  const [rows] = await pool.query(
    'SELECT * FROM academic_years WHERE id = ? LIMIT 1',
    [yearId]
  );
  return rows[0] || null;
}

// ═══════════════════════════════════════════
//  ACADEMIC YEARS
// ═══════════════════════════════════════════

app.get('/api/years', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM academic_years ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/years/current', async (_req, res) => {
  try {
    const year = await getCurrentYear();
    if (!year) {
      return res.status(404).json({ error: 'No current year set' });
    }
    res.json(year);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual set current year (NEW)
app.post('/api/years/set-current', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { yearId } = req.body;

    if (!yearId) {
      await conn.rollback();
      return res.status(400).json({ error: 'yearId is required' });
    }

    const [yearRows] = await conn.query(
      'SELECT id, year FROM academic_years WHERE id = ? LIMIT 1',
      [yearId]
    );

    if (yearRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Academic year not found' });
    }

    await conn.query('UPDATE academic_years SET is_current = FALSE WHERE is_current = TRUE');
    await conn.query('UPDATE academic_years SET is_current = TRUE WHERE id = ?', [yearId]);

    await conn.commit();

    res.json({
      success: true,
      message: `Academic year ${yearRows[0].year} is now active.`,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════
//  BATCHES
// ═══════════════════════════════════════════

app.get('/api/batches', async (_req, res) => {
  try {
    const year = await getCurrentYear();
    if (!year) return res.json([]);

    const [rows] = await pool.query(
      'SELECT * FROM batches WHERE year_id = ? ORDER BY id ASC',
      [year.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional: get batches by yearId
app.get('/api/batches/:yearId', async (req, res) => {
  try {
    const yearId = req.params.yearId;
    const [rows] = await pool.query(
      'SELECT * FROM batches WHERE year_id = ? ORDER BY id ASC',
      [yearId]
    );
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
      SELECT p.id, p.name, p.prefect_id, p.is_active, p.created_at, p.\`rank\`,
             b.name AS batch, b.id AS batch_id,
             ay.year AS academic_year, ay.id AS year_id
      FROM prefects p
      JOIN batches b ON p.batch_id = b.id
      JOIN academic_years ay ON b.year_id = ay.id
      WHERE p.is_active = TRUE
      ORDER BY ay.id DESC, b.name ASC, p.\`rank\` ASC, p.name ASC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new prefect
app.post('/api/prefects', async (req, res) => {
  try {
    const { id, name, prefectId, batch, rank } = req.body;
    const year = await getCurrentYear();

    if (!year) {
      return res.status(400).json({ error: 'No current academic year set' });
    }

    const [batches] = await pool.query(
      'SELECT id FROM batches WHERE name = ? AND year_id = ?',
      [batch, year.id]
    );

    if (batches.length === 0) {
      return res.status(400).json({
        error: `Batch "${batch}" not found for current year`,
      });
    }

    const prefectRank = rank || 0;

    await pool.query(
      'INSERT INTO prefects (id, name, prefect_id, batch_id, `rank`) VALUES (?, ?, ?, ?, ?)',
      [id, name, prefectId, batches[0].id, prefectRank]
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

    if (!year) {
      return res.status(400).json({ error: 'No current academic year set' });
    }

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

// Bulk add duty records for multiple prefects
app.post('/api/duties/bulk', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { prefectIds, duties, date } = req.body;
    // duties = [{ dutyType: string, points: number }, ...]

    if (!prefectIds || !Array.isArray(prefectIds) || prefectIds.length === 0 || !duties || !Array.isArray(duties) || duties.length === 0 || !date) {
      await conn.rollback();
      return res.status(400).json({
        error: 'prefectIds (array), duties (array of { dutyType, points }), and date are required',
      });
    }

    const year = await getCurrentYear();
    if (!year) {
      await conn.rollback();
      return res.status(400).json({ error: 'No current academic year set' });
    }

    let totalRecords = 0;

    for (const prefectId of prefectIds) {
      for (const duty of duties) {
        const id = crypto.randomUUID();
        await conn.query(
          'INSERT INTO duty_records (id, prefect_id, duty_type, points, date, year_id) VALUES (?, ?, ?, ?, ?, ?)',
          [id, prefectId, duty.dutyType, duty.points, date, year.id]
        );
        totalRecords++;
      }
    }

    await conn.commit();

    const totalPoints = duties.reduce((s, d) => s + d.points, 0);

    res.status(201).json({
      success: true,
      prefectCount: prefectIds.length,
      dutyCount: duties.length,
      totalRecords,
      message: `${totalRecords} duty records added for ${prefectIds.length} prefect(s) — ${totalPoints} pts each.`,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════
//  PROMOTION — LINEAR TIER LADDER
// ═══════════════════════════════════════════
//
//  Tier order:
//    Prefect Applicant
//    → Trainee Prefect
//    → Assistant Prefect (Probationary)
//    → Assistant Prefect
//    → Junior Prefect
//    → Senior Prefect
//
//  On each promotion:
//    1. Calculate total points for each prefect in the source batch
//    2. Top N are promoted to the target batch
//    3. Promoted prefects get their duty_records DELETED (points reset)
//    4. Promoted prefects are re-ranked in the target batch by
//       descending total_points (rank 1 = had the most points)
//    5. Non-promoted prefects are deactivated
//

// Step 1: Initialize academic year with ALL 6 tier batches
app.post('/api/promote/init', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { newYear } = req.body;

    if (!newYear) {
      await conn.rollback();
      return res.status(400).json({
        error: 'newYear is required (e.g. "2026/2027")',
      });
    }

    // Create new academic year (NOT current yet)
    const [insertResult] = await conn.query(
      'INSERT INTO academic_years (year, is_current) VALUES (?, FALSE)',
      [newYear]
    );

    const newYearId = insertResult.insertId;

    // Create all 6 tier batches for the new year
    const tierNames = [
      'Prefect Applicant',
      'Trainee Prefect',
      'Assistant Prefect (Probationary)',
      'Assistant Prefect',
      'Junior Prefect',
      'Senior Prefect',
    ];

    const placeholders = tierNames.map(() => '(?, ?)').join(', ');
    const values = tierNames.flatMap(name => [name, newYearId]);

    await conn.query(
      `INSERT INTO batches (name, year_id) VALUES ${placeholders}`,
      values
    );

    await conn.commit();

    res.json({
      success: true,
      message: `Initialized ${newYear} with all 6 tier batches.`,
      newYearId,
    });
  } catch (err) {
    await conn.rollback();

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: `Academic year "${req.body.newYear}" already exists`,
      });
    }

    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Step 2: Promote top N from source batch → target batch (in-place, no year change)
app.post('/api/promote/batch', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { sourceBatch, targetBatch, promoteCount } = req.body;

    if (!sourceBatch || !targetBatch || promoteCount == null) {
      await conn.rollback();
      return res.status(400).json({
        error: 'sourceBatch, targetBatch and promoteCount are required',
      });
    }

    if (Number(promoteCount) < 0) {
      await conn.rollback();
      return res.status(400).json({
        error: 'promoteCount must be 0 or greater',
      });
    }

    // Current year
    const [currentYears] = await conn.query(
      'SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1'
    );

    if (currentYears.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'No current academic year set' });
    }

    const currentYearId = currentYears[0].id;

    // Get source batch id from current year
    const [sourceBatches] = await conn.query(
      'SELECT id FROM batches WHERE name = ? AND year_id = ? LIMIT 1',
      [sourceBatch, currentYearId]
    );

    if (sourceBatches.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        error: `Source batch "${sourceBatch}" not found in current year`,
      });
    }

    const sourceBatchId = sourceBatches[0].id;

    // Get target batch id from current year (same year — in-place promotion)
    const [targetBatches] = await conn.query(
      'SELECT id FROM batches WHERE name = ? AND year_id = ? LIMIT 1',
      [targetBatch, currentYearId]
    );

    if (targetBatches.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        error: `Target batch "${targetBatch}" not found in current year`,
      });
    }

    const targetBatchId = targetBatches[0].id;

    // Get active prefects from source batch ordered by current rank
    const [prefects] = await conn.query(
      `SELECT id, name, prefect_id, \`rank\`
       FROM prefects
       WHERE batch_id = ? AND is_active = TRUE
       ORDER BY \`rank\` ASC, name ASC`,
      [sourceBatchId]
    );

    if (prefects.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        error: `No active prefects found in source batch "${sourceBatch}"`,
      });
    }

    const limit = Math.min(Number(promoteCount), prefects.length);
    const toPromote = prefects.slice(0, limit);
    const toDeactivate = prefects.slice(limit);

    let promotedWithPoints = [];

    // Rank promoted students by current total points (before reset)
    if (toPromote.length > 0) {
      const promoteIds = toPromote.map(p => p.id);

      const [rows] = await conn.query(
        `SELECT p.id, COALESCE(SUM(d.points), 0) AS total_points
         FROM prefects p
         LEFT JOIN duty_records d
           ON d.prefect_id = p.id
          AND d.year_id = ?
         WHERE p.id IN (?)
         GROUP BY p.id
         ORDER BY total_points DESC, p.name ASC`,
        [currentYearId, promoteIds]
      );

      promotedWithPoints = rows;

      // Move promoted ones into target batch and assign new rank
      for (let i = 0; i < promotedWithPoints.length; i++) {
        await conn.query(
          'UPDATE prefects SET batch_id = ?, `rank` = ?, is_active = TRUE WHERE id = ?',
          [targetBatchId, i + 1, promotedWithPoints[i].id]
        );
      }

      // Delete all duty_records for promoted prefects (reset points to 0)
      await conn.query(
        'DELETE FROM duty_records WHERE prefect_id IN (?) AND year_id = ?',
        [promoteIds, currentYearId]
      );
    }

    // Deactivate the rest in source batch
    for (const p of toDeactivate) {
      await conn.query(
        'UPDATE prefects SET is_active = FALSE WHERE id = ?',
        [p.id]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      sourceBatch,
      targetBatch,
      promoted: toPromote.length,
      deactivated: toDeactivate.length,
      promotedIds: promotedWithPoints.map(p => p.id),
      message: `${toPromote.length} ${sourceBatch}(s) promoted to ${targetBatch}. ${toDeactivate.length} deactivated. Points reset.`,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Remove all active Senior Prefects (deactivate them)
app.post('/api/promote/remove-seniors', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [currentYears] = await conn.query(
      'SELECT * FROM academic_years WHERE is_current = TRUE LIMIT 1'
    );

    if (currentYears.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'No current academic year set' });
    }

    const currentYearId = currentYears[0].id;

    const [seniorBatches] = await conn.query(
      'SELECT id FROM batches WHERE name = ? AND year_id = ? LIMIT 1',
      ['Senior Prefect', currentYearId]
    );

    if (seniorBatches.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Senior Prefect batch not found for current year',
      });
    }

    const [result] = await conn.query(
      'UPDATE prefects SET is_active = FALSE WHERE batch_id = ? AND is_active = TRUE',
      [seniorBatches[0].id]
    );

    await conn.commit();

    res.json({
      success: true,
      removed: result.affectedRows,
      message: `${result.affectedRows} Senior Prefect(s) removed (deactivated).`,
    });
  } catch (err) {
    await conn.rollback();
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