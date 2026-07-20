const express = require('express');
const cors = require('cors');
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

// Ensure ledger table exists
const ensureLedgerTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ledger (
                id BIGSERIAL PRIMARY KEY,
                date DATE NOT NULL,
                hours NUMERIC NOT NULL,
                remarks TEXT
            );
        `);
        console.log('✅ ledger table ready');
    } catch (err) {
        console.error('❌ Failed to create ledger table', err.stack);
    }
};

ensureLedgerTable();

// --- API ROUTES ---

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
app.get('/api/ledger', async (req, res) => {
    try {
            const { rows } = await pool.query("SELECT id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks FROM ledger ORDER BY date DESC, id DESC");
        res.json(rows);
    } catch (err) {
        console.error('Error fetching ledger', err.stack);
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});

// Add ledger entry (DB)
app.post('/api/ledger', async (req, res) => {
    try {
        const { date, hours, remarks } = req.body;
        if (!date || typeof hours === 'undefined') {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { rows } = await pool.query("INSERT INTO ledger(date, hours, remarks) VALUES($1, $2, $3) RETURNING id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks", [date, hours, remarks || '']);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error inserting ledger', err.stack);
        res.status(500).json({ error: 'Failed to insert ledger' });
    }
});

// Update ledger entry (DB)
app.put('/api/ledger/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { date, hours, remarks } = req.body;
        const { rows } = await pool.query("UPDATE ledger SET date=$1, hours=$2, remarks=$3 WHERE id=$4 RETURNING id, to_char(date, 'YYYY-MM-DD') as date, hours, remarks", [date, hours, remarks || '', id]);
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating ledger', err.stack);
        res.status(500).json({ error: 'Failed to update ledger' });
    }
});

// Delete ledger entry (DB)
app.delete('/api/ledger/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { rowCount } = await pool.query('DELETE FROM ledger WHERE id=$1', [id]);
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