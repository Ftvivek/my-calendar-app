console.log(">>> SERVER.JS STARTED <<<");

// server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');

// Load environment variables from .env file (does not override Azure vars)
require('dotenv').config();


const app = express();
const port = process.env.PORT || 5000;
const host = '0.0.0.0';

// --- Core Middleware ---
app.use(cors());
app.use(express.json()); // Use express built-in JSON parser

// --- Database Configuration ---
// Log the NEW variable we intend to use
console.log(`>>> BEFORE Pool creation: process.env.APP_DB_TARGET = [${process.env.APP_DB_TARGET}]`);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.APP_DB_TARGET, // <<<--- CONSISTENTLY USE APP_DB_TARGET
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: true
});

// Log the actual database name the pool IS configured with (using backticks ``)
console.log(`>>> AFTER Pool creation, pool.options.database = [${pool.options.database}]`);

// --- Environment Variable Logging & Check ---
console.log('--- Environment Variables Used ---');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('APP_DB_TARGET:', process.env.APP_DB_TARGET); // <<<--- Log the NEW variable
console.log('DB_PASSWORD exists?:', !!process.env.DB_PASSWORD);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('---------------------------');

// Check if essential DB variables (using APP_DB_TARGET) are missing
if (!process.env.DB_USER || !process.env.DB_HOST || !process.env.APP_DB_TARGET || !process.env.DB_PASSWORD || !process.env.DB_PORT) { // <<<--- CORRECTED CHECK
    console.error("FATAL ERROR: Critical database configuration environment variables missing!");
    if (!process.env.DB_USER) console.error("- DB_USER missing");
    if (!process.env.DB_HOST) console.error("- DB_HOST missing");
    if (!process.env.APP_DB_TARGET) console.error("- APP_DB_TARGET missing");
    if (!process.env.DB_PASSWORD) console.error("- DB_PASSWORD missing");
    if (!process.env.DB_PORT) console.error("- DB_PORT missing");
    process.exit(1); // Exit if critical configuration is missing
}

// --- Multer Configuration ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- Helper Function ---
const isValidDate = (dateString) => {
    // Basic YYYY-MM-DD format check and ensures it's a valid date object
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString + 'T00:00:00Z'));
};


// --- >>> Serve Static Frontend Files <<< ---
// Serve files from the 'frontend_build' directory


// --- >>> API Endpoints <<< ---

// GET /api/collection/today
app.get('/api/collection/today', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    let client;
    try {
        const today = new Date().toISOString().slice(0, 10);
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to fetch today\'s collection data', details: err.message });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// GET /api/collection/:date
app.get('/api/collection/:date', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const { date } = req.params;
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    let client;
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to fetch collection data' });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// GET /api/students
app.get('/api/students', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    let client;
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        const result = await client.query(`
            SELECT id, name, grade, admission_date, mobile_no, address,
                   encode(student_photo, 'base64') as student_photo_base64,
                   encode(id_proof, 'base64') as id_proof_base64
            FROM student_management.students
            ORDER BY name ASC
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to fetch students' });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// GET /api/students/search
app.get('/api/students/search', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const searchTerm = req.query.name;
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
        return res.status(400).json({ error: 'Search term cannot be empty.' });
    }
    let client;
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        const query = `
            SELECT id, name, grade, admission_date, mobile_no, address,
                   encode(student_photo, 'base64') as student_photo_base64,
                   encode(id_proof, 'base64') as id_proof_base64
            FROM student_management.students
            WHERE LOWER(name) LIKE $1
            ORDER BY name ASC
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to search for students.' });
    } finally {
        if (client) {
            console.log(`>>> ${req.originalUrl}: Releasing client`);
            client.release();
        }
    }
});

// GET /api/students/admitted/:date
app.get('/api/students/admitted/:date', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const admissionDate = req.params.date;
    if (!isValidDate(admissionDate)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    let client;
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        const result = await client.query(
            `SELECT id, name, grade, admission_date, mobile_no, address,
                    encode(student_photo, 'base64') as student_photo_base64,
                    encode(id_proof, 'base64') as id_proof_base64
             FROM student_management.students
             WHERE DATE(admission_date) = $1
             ORDER BY name ASC`,
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to fetch students by admission date' });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// GET /api/students/admitted/day/:day (Deprecated Candidate)
app.get('/api/students/admitted/day/:day', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    console.warn("WARN: Endpoint /api/students/admitted/day/:day is likely not suitable for StudentManagement page logic. Consider using /api/students/manageable-on-date/:date.");
    const dayOfMonth = parseInt(req.params.day, 10);
    const clickedDateStr = req.query.date;
    if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31 || !clickedDateStr || !isValidDate(clickedDateStr)) {
        return res.status(400).json({ error: 'Invalid day of the month or missing/invalid query parameter: date (YYYY-MM-DD).' });
    }
    let client;
     try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        const clickedDate = new Date(clickedDateStr + 'T00:00:00Z');
        const oneDayBefore = new Date(clickedDate);
        oneDayBefore.setUTCDate(clickedDate.getUTCDate() - 1);
        const formattedOneDayBefore = oneDayBefore.toISOString().slice(0, 10);
        const admittedStudentsQuery = `SELECT id, name FROM student_management.students WHERE EXTRACT(DAY FROM admission_date) = $1`;
        const admittedStudentsResult = await client.query(admittedStudentsQuery, [dayOfMonth]);
        const admittedStudents = admittedStudentsResult.rows;
        const studentNames = admittedStudents.map(student => student.name).filter(name => name);
        let statuses = [];
        if (studentNames.length > 0) {
            const statusQuery = `SELECT name, cash, online, suspend FROM student_management.student WHERE DATE(date) = $1 AND name = ANY($2::text[])`;
            const statusResult = await client.query(statusQuery, [formattedOneDayBefore, studentNames]);
            statuses = statusResult.rows;
        }
        const pendingStudents = [], paidStudents = [], suspendedStudents = [];
        admittedStudents.forEach(student => {
            if (!student.name) return;
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to fetch student status based on previous day.' });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// GET /api/students/manageable-on-date/:date
app.get('/api/students/manageable-on-date/:date', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const { date: requestedDate } = req.params;
    let client;
    if (!isValidDate(requestedDate)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        const reqDateObj = new Date(requestedDate + 'T00:00:00Z');
        const dayOfMonth = reqDateObj.getUTCDate();
        const relevantStudentsQuery = `
            SELECT s.id, s.name
            FROM student_management.students s
            WHERE EXTRACT(DAY FROM s.admission_date) = $1
              AND DATE(s.admission_date) <= $2
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
                SELECT name, cash, online, suspend
                FROM student_management.student
                WHERE DATE(date) = $1
                  AND LOWER(TRIM(name)) = ANY($2::text[])
            `;
            const statusResult = await client.query(statusQuery, [requestedDate, cleanStudentNamesForQuery]);
            statusesOnDateRaw = statusResult.rows;
        }

        const pendingStudents = [], paidStudents = [], suspendedStudents = [];
        relevantStudents.forEach(student => {
            if (!student.name) {
                console.warn(`Skipping student with ID ${student.id} due to null name.`);
                return;
            }
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: `Failed to fetch student status for ${requestedDate}.`, details: err.message });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// PUT /api/student-payment-status/:date/:studentName
app.put('/api/student-payment-status/:date/:studentName', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const { date, studentName: rawStudentName } = req.params;
    const { cash, online, suspend } = req.body;

    // Validations
    if (!isValidDate(date)) { return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' }); }
    if (typeof cash !== 'boolean' || typeof online !== 'boolean' || typeof suspend !== 'boolean') { return res.status(400).json({ error: 'Request body must include cash, online, and suspend as boolean values.' }); }
    const studentName = rawStudentName ? rawStudentName.trim() : '';
    if (!studentName) { return res.status(400).json({ error: 'Invalid or missing student name.' }); }

    let client;
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        await client.query('BEGIN');
        const checkResult = await client.query('SELECT name FROM student_management.student WHERE DATE(date) = $1 AND name = $2', [date, studentName]);
        if (checkResult.rows.length > 0) {
            await client.query('UPDATE student_management.student SET cash = $1, online = $2, suspend = $3 WHERE DATE(date) = $4 AND name = $5', [cash, online, suspend, date, studentName]);
        } else {
            await client.query('INSERT INTO student_management.student (name, cash, online, suspend, date) VALUES ($1, $2, $3, $4, $5)', [studentName, cash, online, suspend, date]);
        }
        await client.query('COMMIT');
        res.json({ message: `Payment status processed for ${studentName} on ${date}.` });
    } catch (err) {
         if (client) await client.query('ROLLBACK');
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to update or insert student payment status.', details: err.message });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});

// POST /api/students
app.post('/api/students', upload.fields([{ name: 'student_photo', maxCount: 1 }, { name: 'id_proof', maxCount: 1 }]), async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const { name, admissionDate, mobile_no, address, grade } = req.body;
    const studentPhotoFile = req.files?.['student_photo']?.[0];
    const idProofFile = req.files?.['id_proof']?.[0];
    let client;

    // Basic Validation
    if (!name || !admissionDate || !mobile_no || !address ) {
        return res.status(400).json({ error: 'Missing required fields: name, admissionDate, mobile_no, address.' });
    }
    if (!isValidDate(admissionDate)) {
        return res.status(400).json({ error: 'Invalid admission date format. Use YYYY-MM-DD.' });
    }

    try {
        console.log(`>>> ${req.originalUrl} (POST): Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl} (POST): pool.connect() successful`);
        const query = `
            INSERT INTO student_management.students
              (name, grade, admission_date, mobile_no, address, student_photo, id_proof)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, grade, admission_date, mobile_no, address,
                      encode(student_photo, 'base64') as student_photo_base64,
                      encode(id_proof, 'base64') as id_proof_base64;
        `;
        const values = [
            name.trim(), grade && grade.trim() ? grade.trim() : null, admissionDate, mobile_no, address.trim(),
            studentPhotoFile ? studentPhotoFile.buffer : null, idProofFile ? idProofFile.buffer : null,
        ];
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
        console.error(`>>> ERROR in ${req.originalUrl} (POST):`, err); // Log detailed error
        if (err.code === '23502' && err.column === 'grade') {
             console.error("Database Schema Error: The 'grade' column does not allow NULL values. Please alter the table or make grade mandatory.");
             res.status(500).json({ error: "Database configuration error: 'grade' cannot be empty." });
        } else if (err.code === '23505') {
             res.status(409).json({ error: 'Failed to add student. Possible duplicate entry (e.g., unique constraint on name or mobile).' });
        } else {
             res.status(500).json({ error: 'Failed to add new student.', details: err.message });
        }
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl} (POST): Releasing client`);
             client.release();
        }
    }
});

// GET /api/students/:id
app.get('/api/students/:id', async (req, res) => {
    console.log(`>>> HIT: ${req.method} ${req.originalUrl}`); // Log route hit
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID.' });
    }
    let client;
    try {
        console.log(`>>> ${req.originalUrl}: Attempting pool.connect()`);
        client = await pool.connect();
        console.log(`>>> ${req.originalUrl}: pool.connect() successful`);
        const query = `
            SELECT id, name, grade, admission_date, mobile_no, address,
                   encode(student_photo, 'base64') as student_photo_base64,
                   encode(id_proof, 'base64') as id_proof_base64
            FROM student_management.students
            WHERE id = $1
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
        console.error(`>>> ERROR in ${req.originalUrl}:`, err); // Log detailed error
        res.status(500).json({ error: 'Failed to fetch student.', details: err.message });
    } finally {
        if (client) {
             console.log(`>>> ${req.originalUrl}: Releasing client`);
             client.release();
        }
    }
});




// --- >>> Error Handling Middleware <<< ---
app.use((err, req, res, next) => {
    console.error(">>> UNHANDLED ERROR MIDDLEWARE:", err.stack || err);
    const errorResponse = { error: 'Something broke unexpectedly on the server!' };
    if (!res.headersSent) {
        res.status(500).json(errorResponse);
    } else {
        next(err);
    }
});

// --- >>> Start Server <<< ---
const server = app.listen(port, host, () => {
    console.log(`>>> Server listening on http://${host}:${port}`);
});

// --- Optional: Graceful shutdown handling ---
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

// --- Handle listener errors (like port in use) ---
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