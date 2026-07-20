const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 5000;

// 1. Middleware
app.use(cors()); // Allows your React app to talk to this API
app.use(express.json()); // Allows the API to read JSON data sent from the frontend

// 2. Database Connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test the database connection on startup
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL successfully!'))
    .catch(err => console.error('❌ Database connection error', err.stack));

// Ensure core tables exist
const ensureTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                email VARCHAR(255),
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                employee_no VARCHAR(100) NOT NULL UNIQUE,
                position VARCHAR(255) NOT NULL,
                office_division VARCHAR(255) NOT NULL,
                monthly_salary NUMERIC(12,2) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'employee',
                status VARCHAR(20) NOT NULL DEFAULT 'approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'employee';
        `);

        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved';
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ledger (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                hours NUMERIC NOT NULL,
                remarks TEXT
            );
        `);
        await pool.query(`
            ALTER TABLE ledger
            ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger(user_id);
        `);

        console.log('✅ database tables ready');
    } catch (err) {
        console.error('❌ Failed to initialize database tables', err.stack);
    }
};

ensureTables();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
};

app.post('/api/auth/register', async (req, res) => {
    try {
        const {
            password,
            full_name,
            employee_no,
            position,
            office_division,
            monthly_salary,
        } = req.body;

        if (!password || !full_name || !employee_no || !position || !office_division || typeof monthly_salary === 'undefined') {
            return res.status(400).json({ error: 'All profile fields are required.' });
        }

        const normalizedEmployeeNo = employee_no.trim();
        const passwordHash = await bcrypt.hash(password, 12);

        const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
        const isFirstUser = countRows[0].count === 0;
        const role = isFirstUser ? 'admin' : 'employee';
        const status = isFirstUser ? 'approved' : 'pending';

        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, employee_no, position, office_division, monthly_salary, role, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, email, full_name, employee_no, position, office_division, monthly_salary, role, status`,
            [null, passwordHash, full_name.trim(), normalizedEmployeeNo, position.trim(), office_division.trim(), Number(monthly_salary), role, status]
        );

        const user = rows[0];
        const token = jwt.sign({ id: user.id, employee_no: user.employee_no, role: user.role, status: user.status }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });

        return res.status(201).json({ token, user });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'An account with this employee ID already exists.' });
        }

        console.error('Registration error', error.stack);
        return res.status(500).json({ error: 'Failed to create account.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { employee_id, password } = req.body;

        if (!employee_id || !password) {
            return res.status(400).json({ error: 'Employee ID and password are required.' });
        }

        const normalizedEmployeeId = employee_id.trim();
        const { rows } = await pool.query(
            'SELECT id, email, password_hash, full_name, employee_no, position, office_division, monthly_salary, role, status FROM users WHERE employee_no = $1',
            [normalizedEmployeeId]
        );

        if (!rows.length) {
            return res.status(401).json({ error: 'Invalid employee ID or password.' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid employee ID or password.' });
        }

        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'This account is pending approval.' });
        }

        const token = jwt.sign({ id: user.id, employee_no: user.employee_no, role: user.role, status: user.status }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                employee_no: user.employee_no,
                position: user.position,
                office_division: user.office_division,
                monthly_salary: user.monthly_salary,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        console.error('Login error', error.stack);
        return res.status(500).json({ error: 'Failed to sign in.' });
    }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, email, full_name, employee_no, position, office_division, monthly_salary, role, status FROM users WHERE id = $1',
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user: rows[0] });
    } catch (error) {
        console.error('Auth lookup error', error.stack);
        return res.status(500).json({ error: 'Failed to load profile.' });
    }
});

// --- API ROUTES ---

app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT u.id, u.full_name, u.employee_no, u.position, u.office_division, u.monthly_salary, u.role, u.status,
                   COALESCE(SUM(l.hours), 0) AS balance
            FROM users u
            LEFT JOIN ledger l ON l.user_id = u.id
            GROUP BY u.id
            ORDER BY u.full_name ASC
        `);

        res.json(rows);
    } catch (error) {
        console.error('Admin users fetch error', error.stack);
        res.status(500).json({ error: 'Failed to load employee records.' });
    }
});

app.get('/api/admin/users/:id/ledger', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks FROM ledger WHERE user_id=$1 ORDER BY date DESC, id DESC",
            [req.params.id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Admin ledger fetch error', error.stack);
        res.status(500).json({ error: 'Failed to load employee ledger.' });
    }
});

app.post('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { password, full_name, employee_no, position, office_division, monthly_salary, role = 'employee' } = req.body;

        if (!password || !full_name || !employee_no || !position || !office_division || typeof monthly_salary === 'undefined') {
            return res.status(400).json({ error: 'All employee fields are required.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const { rows } = await pool.query(
            `INSERT INTO users (password_hash, full_name, employee_no, position, office_division, monthly_salary, role, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
             RETURNING id, full_name, employee_no, role, status`,
            [passwordHash, full_name.trim(), employee_no.trim(), position.trim(), office_division.trim(), Number(monthly_salary), role]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'An employee with that ID already exists.' });
        }

        console.error('Admin user create error', error.stack);
        res.status(500).json({ error: 'Failed to create employee.' });
    }
});

app.post('/api/admin/users/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "UPDATE users SET status='approved' WHERE id=$1 RETURNING id, full_name, employee_no, status",
            [req.params.id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Employee not found.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Admin approve error', error.stack);
        res.status(500).json({ error: 'Failed to approve employee.' });
    }
});

app.post('/api/admin/users/:id/disapprove', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "UPDATE users SET status='pending' WHERE id=$1 RETURNING id, full_name, employee_no, status",
            [req.params.id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Employee not found.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Admin disapprove error', error.stack);
        res.status(500).json({ error: 'Failed to disapprove employee.' });
    }
});

app.put('/api/admin/users/:id/role', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ error: 'A role is required.' });

        const { rows } = await pool.query(
            "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, full_name, employee_no, role",
            [role, req.params.id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Employee not found.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Admin role update error', error.stack);
        res.status(500).json({ error: 'Failed to update employee role.' });
    }
});

app.put('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { full_name, position, office_division, monthly_salary, role, status } = req.body;
        const { rows } = await pool.query(
            `UPDATE users SET full_name=$1, position=$2, office_division=$3, monthly_salary=$4, role=$5, status=$6
             WHERE id=$7 RETURNING id, full_name, employee_no, position, office_division, monthly_salary, role, status`,
            [full_name.trim(), position.trim(), office_division.trim(), Number(monthly_salary), role, status, req.params.id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Employee not found.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Admin edit error', error.stack);
        res.status(500).json({ error: 'Failed to update employee details.' });
    }
});

app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
        if (!rowCount) return res.status(404).json({ error: 'Employee not found.' });
        res.status(204).send();
    } catch (error) {
        console.error('Admin delete error', error.stack);
        res.status(500).json({ error: 'Failed to delete employee.' });
    }
});

app.post('/api/admin/users/:id/credit', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { hours, remarks } = req.body;
        if (typeof hours === 'undefined' || Number(hours) <= 0) {
            return res.status(400).json({ error: 'A positive credit amount is required.' });
        }

        const { rows } = await pool.query(
            "INSERT INTO ledger(user_id, date, hours, remarks) VALUES($1, CURRENT_DATE, $2, $3) RETURNING id, user_id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks",
            [req.params.id, Number(hours), remarks || 'Admin added verified credit']
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Admin credit error', error.stack);
        res.status(500).json({ error: 'Failed to add credit.' });
    }
});

// Health check route (just to make sure the server is alive)
app.get('/api/health', (req, res) => {
    res.json({ message: 'Backend is up and running!' });
});

// 3. The PDF Generation Endpoint (Skeleton)
app.post('/api/generate-cto', async (req, res) => {
    try {
        // 1. Extract data from the frontend request
        const { employeeName, startDate, endDate, cocBalance } = req.body;

        // 2. We will inject this data into our HTML template later.
        // For now, let's create a very basic HTML string to test the engine.
        const htmlContent = `
      <html>
        <body>
          <h1>Compensatory Time-Off Application</h1>
          <p>Employee: ${employeeName}</p>
          <p>Dates: ${startDate} to ${endDate}</p>
          <p>COC Balance: ${cocBalance}</p>
        </body>
      </html>
    `;

        // 3. Launch Puppeteer
        // We use the specific executable path because we installed Chromium at the system level in Docker
        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for Docker
        });

        const page = await browser.newPage();

        // Load the HTML into the page
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // 4. Generate the PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
        });

        await browser.close();

        // 5. Send the PDF back to the frontend as a downloadable file
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="CTO_Application.pdf"',
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF document.' });
    }
});

// Get ledger (DB-backed)
app.get('/api/ledger', verifyToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, user_id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks FROM ledger WHERE user_id=$1 ORDER BY date DESC, id DESC",
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching ledger', err.stack);
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});

// Add ledger entry (DB)
app.post('/api/ledger', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to add credit entries.' });
    }

    try {
        const { date, hours, remarks } = req.body;
        if (!date || typeof hours === 'undefined') {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { rows } = await pool.query(
            "INSERT INTO ledger(user_id, date, hours, remarks) VALUES($1, $2, $3, $4) RETURNING id, user_id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks",
            [req.user.id, date, hours, remarks || '']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error inserting ledger', err.stack);
        res.status(500).json({ error: 'Failed to insert ledger' });
    }
});

// Update ledger entry (DB)
app.put('/api/ledger/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to update credit entries.' });
    }

    try {
        const id = Number(req.params.id);
        const { date, hours, remarks } = req.body;
        const { rows } = await pool.query(
            "UPDATE ledger SET date=$1, hours=$2, remarks=$3 WHERE id=$4 AND user_id=$5 RETURNING id, user_id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks",
            [date, hours, remarks || '', id, req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating ledger', err.stack);
        res.status(500).json({ error: 'Failed to update ledger' });
    }
});

// Delete ledger entry (DB)
app.delete('/api/ledger/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to delete credit entries.' });
    }

    try {
        const id = Number(req.params.id);
        const { rowCount } = await pool.query('DELETE FROM ledger WHERE id=$1 AND user_id=$2', [id, req.user.id]);
        if (!rowCount) return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting ledger', err.stack);
        res.status(500).json({ error: 'Failed to delete ledger' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});