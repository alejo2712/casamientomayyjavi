'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- CORS ----
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile direct, curl)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      cb(null, true);
    } else {
      cb(new Error('CORS not allowed for origin: ' + origin));
    }
  },
  methods: ['POST', 'GET', 'OPTIONS'],
}));

app.use(express.json());

// ---- Multer — in-memory storage ----
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, png, webp).'));
    }
  },
});

// ---- Google Drive helper ----
function getDriveClient() {
  // Option A: JSON credentials file path
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    return google.drive({ version: 'v3', auth });
  }

  // Option B: Inline JSON (for Railway / Vercel env vars)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    return google.drive({ version: 'v3', auth });
  }

  throw new Error('Google Drive credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON.');
}

/**
 * Find or create the target folder in Google Drive.
 * Returns the folder ID.
 */
async function getOrCreateFolder(drive, folderName) {
  // If explicit folder ID is set, use it directly
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  // Search for existing folder
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Upload a buffer to Google Drive.
 * Returns the file's web view link.
 */
async function uploadToGoogleDrive(buffer, filename, mimeType) {
  const drive = getDriveClient();
  const FOLDER_NAME = process.env.GOOGLE_DRIVE_FOLDER_NAME || 'Mailen_Javier_Wedding_Photos';

  const folderId = await getOrCreateFolder(drive, FOLDER_NAME);

  // Convert buffer to readable stream
  const readableStream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: readableStream,
    },
    fields: 'id, name, webViewLink',
  });

  // Make file readable by anyone with the link (optional — remove if private is preferred)
  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (_) {
    // Non-critical — file still uploaded even if sharing fails
  }

  return res.data;
}

// ---- Routes ----

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'casamientomayyjavi-backend' });
});

/**
 * POST /upload-photo
 * Accepts multipart/form-data with field "photo"
 */
app.post('/upload-photo', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received. Send field "photo".' });
  }

  const timestamp = Date.now();
  const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
  const filename = `wedding-photo-${timestamp}.${ext}`;

  try {
    const driveFile = await uploadToGoogleDrive(
      req.file.buffer,
      filename,
      req.file.mimetype
    );

    return res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully!',
      filename: driveFile.name,
      fileId: driveFile.id,
      link: driveFile.webViewLink,
    });
  } catch (err) {
    console.error('Drive upload error:', err.message);
    return res.status(500).json({
      error: 'Failed to upload to Google Drive.',
      detail: err.message,
    });
  }
});

// ---- Serve frontend in production (optional) ----
if (process.env.SERVE_FRONTEND === 'true') {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ---- Multer error handler ----
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  if (err.message && err.message.includes('Only image')) {
    return res.status(415).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Wedding Photo Booth backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
