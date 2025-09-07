// src/routes/upload.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../db';

const router = Router();

// Setup multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Helper to parse JSON/YAML
function parseSpec(buffer: Buffer, filename: string): object {
  const ext = path.extname(filename).toLowerCase();
  const content = buffer.toString('utf8');

  try {
    if (ext === '.json') return JSON.parse(content);
    if (ext === '.yaml' || ext === '.yml') {
      const yaml = require('yaml');
      return yaml.parse(content);
    }
    throw new Error('Unsupported file type');
  } catch (err) {
    throw new Error(`Invalid ${ext} file: ${(err as Error).message}`);
  }
}

// POST /upload
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    const { application, service } = req.body;
    const file = req.file;

    if (!application) {
      return res.status(400).json({ error: 'application is required' });
    }
    if (!file) {
      return res.status(400).json({ error: 'file is required' });
    }

    // Validate JSON/YAML
    parseSpec(file.buffer, file.originalname);

    // Ensure folder exists under data/schemas
    const baseDir = path.join(process.cwd(), 'data', 'schemas'); // 👈 stable base dir
    const folder = path.join(baseDir, application, service || '__app');
    fs.mkdirSync(folder, { recursive: true });

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Insert application if not exists
    db.prepare('INSERT OR IGNORE INTO application (name) VALUES (?)').run(application);

    // Insert service if provided
    let serviceId: number | null = null;
    if (service) {
      db.prepare(
        'INSERT OR IGNORE INTO service (name, applicationId) VALUES (?, (SELECT id FROM application WHERE name = ?))'
      ).run(service, application);

      const srow = db
        .prepare(
          'SELECT id FROM service WHERE name = ? AND applicationId = (SELECT id FROM application WHERE name = ?)'
        )
        .get(service, application) as { id: number } | undefined;

      if (!srow) return res.status(500).json({ error: 'Service row not found' });
      serviceId = srow.id;
    }

    // Get application ID
    const appRow = db.prepare('SELECT id FROM application WHERE name = ?').get(application) as
      | { id: number }
      | undefined;
    if (!appRow) return res.status(500).json({ error: 'Application row not found' });

    // Determine last version
    const lastRow = service
      ? (db
          .prepare(
            'SELECT MAX(version) as v FROM schema_version WHERE applicationId = ? AND serviceId = ?'
          )
          .get(appRow.id, serviceId) as { v?: number } | undefined)
      : (db
          .prepare(
            'SELECT MAX(version) as v FROM schema_version WHERE applicationId = ? AND serviceId IS NULL'
          )
          .get(appRow.id) as { v?: number } | undefined);

    const version = (lastRow?.v || 0) + 1;

    // Save file
    const filename = `${version}-${file.originalname}`;
    const absPath = path.join(folder, filename);
    fs.writeFileSync(absPath, file.buffer);

    // Store relative path in DB (portable)
    const relativePath = path.relative(process.cwd(), absPath);

    // Insert row with path
    db.prepare(
      'INSERT INTO schema_version (filename, checksum, version, applicationId, serviceId, path) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(file.originalname, checksum, version, appRow.id, serviceId, relativePath);

    return res.json({
      message: 'File uploaded successfully',
      application,
      service: service || null,
      version,
      path: relativePath, // return relative path
      checksum,
    });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
