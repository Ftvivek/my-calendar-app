console.log(">>> SERVER.JS STARTED <<<");

const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');

// Load environment variables from .env file (only for local dev)
// Variables set by Elastic Beanstalk environment will override these.
require('dotenv').config();

const app = express();
// Elastic Beanstalk provides PORT environment variable (usually 8080)
const port = process.env.PORT || 5000; // Fallback to 5000 for local dev
const host = '0.0.0.0'; // Listen on all network interfaces

// --- Core Middleware ---

// Configure CORS properly for production
const allowedOrigins = [
    'https://d30wi6koyxhv8f.cloudfront.net', // Your deployed frontend URL
    'http://localhost:3000' // Allow local development frontend
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests from allowed origins, plus requests with no origin
        // (like mobile apps or curl requests, server-to-server) - Be careful if only browser access needed
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`); // Log blocked origins
            callback(new Error('Not allowed by CORS'));
        }
    },
    // Add methods, headers, credentials if needed for your app's requirements
    // methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // credentials: true,
};
app.use(cors(corsOptions)); // <<<--- USE CONFIGURED CORS ---

app.use(express.json()); // Use express built-in JSON parser

// --- Database Configuration ---

// --- CHANGE: Use DATABASE_URL connection string (simpler for EB/RDS) ---
const connectionString = process.env.DATABASE_URL;

console.log(`>>> BEFORE Pool creation: process.env.DATABASE_URL exists? [${!!connectionString}]`);

// Check if DATABASE_URL is missing (Essential for deployment)
if (!connectionString) {
    console.error("FATAL ERROR: DATABASE_URL environment variable is missing!");
    console.error("Check Elastic Beanstalk Configuration -> Software -> Environment properties.");
    process.exit(1); // Exit if critical configuration is missing
}

const pool = new Pool({
    connectionString: connectionString,
    // --- CHANGE: Add SSL configuration needed for AWS RDS ---
    // NODE_ENV will be 'production' on Elastic Beanstalk by default
    ssl: process.env.NODE_ENV === 'production'
         ? { rejectUnauthorized: false } // Necessary for RDS default certs
         : false // Disable SSL for local HTTP connection if needed
});

console.log(`>>> AFTER Pool creation, attempting initial DB connection check...`);

// --- Optional: Test DB Connection on Startup ---
pool.connect((err, client, release) => {
  if (err) {
    console.error('>>> FATAL ERROR connecting to database on startup:', err.stack);
    // Optionally exit if initial connection fails
    // process.exit(1);
  } else {
    console.log('>>> Initial Database connection successful. Releasing client.');
    client.query('SELECT NOW()', (err, result) => {
      release(); // Release client back to pool
      if (err) {
        console.error('>>> Error executing test query:', err.stack);
      } else {
        console.log('>>> Test query successful. DB Time:', result.rows[0].now);
      }
    });
  }
});


// --- Environment Variable Logging ---
console.log('--- Environment Variables Summary ---');
console.log('DATABASE_URL exists?:', !!process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT); // Will be set by EB
console.log('NODE_ENV:', process.env.NODE_ENV); // Should be 'production' on EB
console.log('---------------------------');

// --- Multer Configuration (using memory storage) ---
// NOTE: Files stored here are temporary (in memory) for the duration of the request.
// They are NOT saved persistently unless you add code to upload them (e.g., to S3).
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- Helper Function ---
const isValidDate = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString + 'T00:00:00Z'));
};

// --- >>> API Endpoints <<< ---

// GET /api/collection/today
app.get('/api/collection/today', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    let client;
    try {
        const today = new Date().toISOString().slice(0, 10);
        client = await pool.connect();
        const onlineQuery = `SELECT COUNT(*) AS online_count FROM student_management.student WHERE DATE(date) = $1 AND online = TRUE;`;
        const cashQuery = `SELECT COUNT(*) AS cash_count FROM student_management.student WHERE DATE(date) = $1 AND cash = TRUE;`;
        const [onlineResult, cashResult] = await Promise.all([
            client.query(onlineQuery, [today]),
            client.query(cashQuery, [today])
        ]);
        const onlineCount = parseInt(onlineResult.rows[0]?.online_count || "0", 10);
        const cashCount = parseInt(cashResult.rows[0]?.cash_count || "0", 10);
        res.json({ onlineCount, cashCount });
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to fetch today\'s collection data', details: err.message });
    } finally {
        if (client) client.release();
    }
});

// GET /api/collection/:date
app.get('/api/collection/:date', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const { date } = req.params;
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    let client;
    try {
        client = await pool.connect();
        const onlineQuery = `SELECT COUNT(*) AS online_count FROM student_management.student WHERE DATE(date) = $1 AND online = TRUE;`;
        const cashQuery = `SELECT COUNT(*) AS cash_count FROM student_management.student WHERE DATE(date) = $1 AND cash = TRUE;`;
        const [onlineResult, cashResult] = await Promise.all([
            client.query(onlineQuery, [date]),
            client.query(cashQuery, [date])
        ]);
        const onlineCount = parseInt(onlineResult.rows[0]?.online_count || '0', 10);
        const cashCount = parseInt(cashResult.rows[0]?.cash_count || '0', 10);
        res.json({ onlineCount, cashCount });
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to fetch collection data' });
    } finally {
        if (client) client.release();
    }
});

// GET /api/students
app.get('/api/students', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(`
            SELECT id, name, grade, admission_date, mobile_no, address,
                   encode(student_photo, 'base64') as student_photo_base64,
                   encode(id_proof, 'base64') as id_proof_base64
            FROM student_management.students ORDER BY name ASC
        `);
        const students = result.rows.map(student => ({
            id: student.id, name: student.name, grade: student.grade,
            admission_date: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-CA') : null,
            mobile_no: student.mobile_no, address: student.address,
            student_photo: student.student_photo_base64 ? `data:image/jpeg;base64,${student.student_photo_base64}` : null,
            id_proof: student.id_proof_base64 ? `data:application/pdf;base64,${student.id_proof_base64}` : null,
        }));
        res.json(students);
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to fetch students' });
    } finally {
        if (client) client.release();
    }
});

// GET /api/students/search
app.get('/api/students/search', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const searchTerm = req.query.name;
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
        return res.status(400).json({ error: 'Search term cannot be empty.' });
    }
    let client;
    try {
        client = await pool.connect();
        const query = `
            SELECT id, name, grade, admission_date, mobile_no, address,
                   encode(student_photo, 'base64') as student_photo_base64,
                   encode(id_proof, 'base64') as id_proof_base64
            FROM student_management.students WHERE LOWER(name) LIKE $1 ORDER BY name ASC
        `;
        const values = [`%${searchTerm.toLowerCase().trim()}%`];
        const result = await client.query(query, values);
        const students = result.rows.map(student => ({
             id: student.id, name: student.name, grade: student.grade,
             admission_date: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-CA') : null,
             mobile_no: student.mobile_no, address: student.address,
             student_photo: student.student_photo_base64 ? `data:image/jpeg;base64,${student.student_photo_base64}` : null,
             id_proof: student.id_proof_base64 ? `data:application/pdf;base64,${student.id_proof_base64}` : null,
        }));
        res.json(students);
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to search for students.' });
    } finally {
        if (client) client.release();
    }
});

// GET /api/students/admitted/:date
app.get('/api/students/admitted/:date', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const admissionDate = req.params.date;
    if (!isValidDate(admissionDate)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, name, grade, admission_date, mobile_no, address,
                    encode(student_photo, 'base64') as student_photo_base64,
                    encode(id_proof, 'base64') as id_proof_base64
             FROM student_management.students WHERE DATE(admission_date) = $1 ORDER BY name ASC`,
            [admissionDate]
        );
         const students = result.rows.map(student => ({
            id: student.id, name: student.name, grade: student.grade,
            admission_date: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-CA') : null,
            mobile_no: student.mobile_no, address: student.address,
            student_photo: student.student_photo_base64 ? `data:image/jpeg;base64,${student.student_photo_base64}` : null,
            id_proof: student.id_proof_base64 ? `data:application/pdf;base64,${student.id_proof_base64}` : null,
        }));
        res.json(students);
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to fetch students by admission date' });
    } finally {
        if (client) client.release();
    }
});

// GET /api/students/admitted/day/:day (Keep warning)
app.get('/api/students/admitted/day/:day', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    console.warn("WARN: Endpoint /api/students/admitted/day/:day is complex and may need review.");
    const dayOfMonth = parseInt(req.params.day, 10);
    const clickedDateStr = req.query.date;
    if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31 || !clickedDateStr || !isValidDate(clickedDateStr)) {
        return res.status(400).json({ error: 'Invalid day or missing/invalid date query param (YYYY-MM-DD).' });
    }
    let client;
     try {
        client = await pool.connect();
        const admittedStudentsQuery = `SELECT id, name FROM student_management.students WHERE EXTRACT(DAY FROM admission_date) = $1 AND DATE(admission_date) <= $2`;
        const admittedStudentsResult = await client.query(admittedStudentsQuery, [dayOfMonth, clickedDateStr]);
        const admittedStudents = admittedStudentsResult.rows;
        const studentNames = admittedStudents.map(student => student.name).filter(name => name);
        let statuses = [];
        if (studentNames.length > 0) {
            const statusQuery = `SELECT name, cash, online, suspend FROM student_management.student WHERE DATE(date) = $1 AND name = ANY($2::text[])`;
            const statusResult = await client.query(statusQuery, [clickedDateStr, studentNames]);
            statuses = statusResult.rows;
        }
        const pendingStudents = [], paidStudents = [], suspendedStudents = [];
        admittedStudents.forEach(student => {
            if (!student.name) return; // Skip if name is null
            const statusInfo = statuses.find(s => s.name && s.name.trim().toLowerCase() === student.name.trim().toLowerCase());
            if (statusInfo) {
                if (statusInfo.suspend) suspendedStudents.push({ id: student.id, name: student.name });
                else if (statusInfo.cash || statusInfo.online) paidStudents.push({ id: student.id, name: student.name, paymentType: statusInfo.cash ? 'cash' : 'online' });
                else pendingStudents.push({ id: student.id, name: student.name });
            } else {
                pendingStudents.push({ id: student.id, name: student.name });
            }
        });
        res.json({ pending: pendingStudents, paid: paidStudents, suspended: suspendedStudents });
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to fetch student status.' });
    } finally {
        if (client) client.release();
    }
});

// GET /api/students/manageable-on-date/:date
app.get('/api/students/manageable-on-date/:date', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const { date: requestedDate } = req.params;
    let client;
    if (!isValidDate(requestedDate)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    try {
        client = await pool.connect();
        const reqDateObj = new Date(requestedDate + 'T00:00:00Z');
        const dayOfMonth = reqDateObj.getUTCDate();
        const relevantStudentsQuery = `
            SELECT s.id, s.name FROM student_management.students s
            WHERE EXTRACT(DAY FROM s.admission_date) = $1 AND DATE(s.admission_date) <= $2
            ORDER BY s.name ASC
        `;
        const relevantStudentsResult = await client.query(relevantStudentsQuery, [dayOfMonth, requestedDate]);
        const relevantStudents = relevantStudentsResult.rows;
        const cleanStudentNamesForQuery = relevantStudents
            .map(student => student.name ? student.name.trim().toLowerCase() : null)
            .filter(name => name !== null);
        let statusesOnDateRaw = [];
        if (cleanStudentNamesForQuery.length > 0) {
            const statusQuery = `
                SELECT name, cash, online, suspend FROM student_management.student
                WHERE DATE(date) = $1 AND LOWER(TRIM(name)) = ANY($2::text[])
            `;
            const statusResult = await client.query(statusQuery, [requestedDate, cleanStudentNamesForQuery]);
            statusesOnDateRaw = statusResult.rows;
        }
        const pendingStudents = [], paidStudents = [], suspendedStudents = [];
        relevantStudents.forEach(student => {
            // *** --- THIS IS THE LINE (APPROX LINE 343) THAT NEEDED FIXING --- ***
            if (!student.name) {
                console.warn(`Skipping student with ID ${student.id} due to null name.`); // Corrected console.warn
                return;
            }
            // *** --- END OF FIX --- ***
            const studentCleanName = student.name.trim().toLowerCase();
            const statusInfo = statusesOnDateRaw.find(s => s.name && s.name.trim().toLowerCase() === studentCleanName);
            const studentDataForList = { id: student.id, name: student.name };
            if (statusInfo) {
                if (statusInfo.suspend) suspendedStudents.push(studentDataForList);
                else if (statusInfo.cash || statusInfo.online) paidStudents.push({...studentDataForList, paymentType: statusInfo.cash ? 'cash' : 'online' });
                else pendingStudents.push(studentDataForList);
            } else {
                pendingStudents.push(studentDataForList);
            }
        });
        res.json({ pending: pendingStudents, paid: paidStudents, suspended: suspendedStudents });
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: `Failed to fetch student status for ${requestedDate}.`, details: err.message });
    } finally {
        if (client) client.release();
    }
});

// PUT /api/student-payment-status/:date/:studentName
app.put('/api/student-payment-status/:date/:studentName', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const { date, studentName: rawStudentName } = req.params;
    const { cash, online, suspend } = req.body;
    if (!isValidDate(date)) { return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' }); }
    if (typeof cash !== 'boolean' || typeof online !== 'boolean' || typeof suspend !== 'boolean') { return res.status(400).json({ error: 'Request body must include boolean cash, online, suspend.' }); }
    const studentName = rawStudentName ? rawStudentName.trim() : '';
    if (!studentName) { return res.status(400).json({ error: 'Invalid or missing student name.' }); }
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const checkResult = await client.query('SELECT name FROM student_management.student WHERE DATE(date) = $1 AND name = $2', [date, studentName]);
        if (checkResult.rows.length > 0) {
            await client.query('UPDATE student_management.student SET cash = $1, online = $2, suspend = $3 WHERE DATE(date) = $4 AND name = $5', [cash, online, suspend, date, studentName]);
        } else {
            await client.query('INSERT INTO student_management.student (name, cash, online, suspend, date) VALUES ($1, $2, $3, $4, $5)', [studentName, cash, online, suspend, date]);
        }
        await client.query('COMMIT');
        res.json({ message: `Status processed for ${studentName} on ${date}.` });
    } catch (err) {
         if (client) await client.query('ROLLBACK');
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to update/insert student payment status.', details: err.message });
    } finally {
        if (client) client.release();
    }
});

// POST /api/students
app.post('/api/students', upload.fields([{ name: 'student_photo', maxCount: 1 }, { name: 'id_proof', maxCount: 1 }]), async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const { name, admissionDate, mobile_no, address, grade } = req.body;
    const studentPhotoFile = req.files?.['student_photo']?.[0];
    const idProofFile = req.files?.['id_proof']?.[0];
    let client;
    if (!name || !admissionDate || !mobile_no || !address ) { return res.status(400).json({ error: 'Missing required fields.' }); }
    if (!isValidDate(admissionDate)) { return res.status(400).json({ error: 'Invalid admission date format.' }); }

    console.warn(">>> WARNING: File uploads in POST /api/students are using memory storage. Files will be lost after request unless uploaded to persistent storage (like S3).")

    try {
        client = await pool.connect();
        const query = `
            INSERT INTO student_management.students (name, grade, admission_date, mobile_no, address, student_photo, id_proof)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, grade, admission_date, mobile_no, address, encode(student_photo, 'base64') as student_photo_base64, encode(id_proof, 'base64') as id_proof_base64;
        `;
        const values = [ name.trim(), grade?.trim(), admissionDate, mobile_no, address.trim(), studentPhotoFile?.buffer, idProofFile?.buffer ];
        const result = await client.query(query, values);
        const newStudent = result.rows[0];
        res.status(201).json({
            id: newStudent.id, name: newStudent.name, grade: newStudent.grade,
            admission_date: newStudent.admission_date ? new Date(newStudent.admission_date).toLocaleDateString('en-CA') : null,
            mobile_no: newStudent.mobile_no, address: newStudent.address,
            student_photo: newStudent.student_photo_base64 ? `data:image/jpeg;base64,${newStudent.student_photo_base64}` : null,
            id_proof: newStudent.id_proof_base64 ? `data:application/pdf;base64,${newStudent.id_proof_base64}` : null,
        });
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl} (POST):`, err);
        if (err.code === '23502' && err.column === 'grade') { res.status(500).json({ error: "DB config error: 'grade' cannot be empty." }); }
        else if (err.code === '23505') { res.status(409).json({ error: 'Failed to add student. Possible duplicate entry.' }); }
        else { res.status(500).json({ error: 'Failed to add new student.', details: err.message }); }
    } finally {
        if (client) client.release();
    }
});

// GET /api/students/:id
app.get('/api/students/:id', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`);
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) { return res.status(400).json({ error: 'Invalid student ID.' }); }
    let client;
    try {
        client = await pool.connect();
        const query = `
            SELECT id, name, grade, admission_date, mobile_no, address,
                   encode(student_photo, 'base64') as student_photo_base64,
                   encode(id_proof, 'base64') as id_proof_base64
            FROM student_management.students WHERE id = $1
        `;
        const result = await client.query(query, [studentId]);
        const student = result.rows[0];
        if (student) {
            res.json({
                id: student.id, name: student.name, grade: student.grade,
                admission_date: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-CA') : null,
                mobile_no: student.mobile_no, address: student.address,
                student_photo: student.student_photo_base64 ? `data:image/jpeg;base64,${student.student_photo_base64}` : null,
                id_proof: student.id_proof_base64 ? `data:application/pdf;base64,${student.id_proof_base64}` : null,
            });
        } else {
            res.status(404).json({ error: 'Student not found.' });
        }
    } catch (err) {
        console.error(`>>> ERROR in ${req.originalUrl}:`, err);
        res.status(500).json({ error: 'Failed to fetch student.', details: err.message });
    } finally {
        if (client) client.release();
    }
});

// --- >>> Error Handling Middleware <<< ---
app.use((err, req, res, next) => {
    console.error(">>> UNHANDLED ERROR MIDDLEWARE:", err.stack || err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Something broke unexpectedly on the server!' });
    } else {
        next(err);
    }
});

// --- >>> Start Server <<< ---
const server = app.listen(port, host, () => {
    console.log(`>>> Server listening on http://${host}:${port}`);
});

process.on('SIGTERM', () => {
    console.log('>>> SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('>>> HTTP server closed');
        pool.end(() => {
            console.log('>>> Database pool closed');
            process.exit(0);
        });
    });
});

server.on('error', (error) => {
    console.error(`>>> SERVER LISTENER ERROR: ${error.code}`);
    if (error.syscall !== 'listen') { throw error; }
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    switch (error.code) {
        case 'EACCES': console.error(`FATAL ERROR: ${bind} requires elevated privileges`); process.exit(1); break;
        case 'EADDRINUSE': console.error(`FATAL ERROR: ${bind} is already in use`); process.exit(1); break;
        default: console.error('FATAL ERROR starting server:', error); throw error;
    }
});

console.log(">>> SERVER.JS END (Reached bottom of file execution)");
