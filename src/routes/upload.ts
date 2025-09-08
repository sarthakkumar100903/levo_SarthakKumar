// routes for all upload requests api
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../db';

const router = Router();

// multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper function to validate and parse the uploaded schema file.
 * It checks for .json, .yaml, or .yml extensions and attempts to parse the content.
 * Parameters
 * buffer The file content as a Buffer.
 * filename The original name of the file.
 * Output:
 * @returns A parsed JavaScript object from the file content.
 * @throws An error if the file type is unsupported or if parsing fails.
 */
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

/**
 * POST /upload
 * Uploads a schema file, versions it, and stores its metadata.
 * It validates the file to ensure it is valid JSON or YAML before processing.
 * Parameters
 * @body {multipart/form-data}
 * file {file} - The OpenAPI/schema file (.json or .yaml) to be uploaded. (required)
 * application {string} - The name of the application the schema belongs to. (required)
 * [service] {string}  - The optional name of the service within the application. (optional)
 */
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

    // Validate that the schema is a parseable JSON/YAML file
    parseSpec(file.buffer, file.originalname);

    // Ensuring folder exists in memory
    const baseDir = path.join(process.cwd(), 'data', 'schemas'); // 👈 stable base dir
    const folder = path.join(baseDir, application, service || '__app');
    fs.mkdirSync(folder, { recursive: true });

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

    // Get application ID from request
    const appRow = db.prepare('SELECT id FROM application WHERE name = ?').get(application) as
      | { id: number }
      | undefined;
    if (!appRow) return res.status(500).json({ error: 'Application row not found' });

    // Determine last version to calculate the new version number
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

    // Save file to disk
    const filename = `${version}-${file.originalname}`;
    const absPath = path.join(folder, filename);
    fs.writeFileSync(absPath, file.buffer);

    const relativePath = path.relative(process.cwd(), absPath);

    // Insert metadata row into the db
    db.prepare(
      'INSERT INTO schema_version (filename, checksum, version, applicationId, serviceId, path) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(file.originalname, checksum, version, appRow.id, serviceId, relativePath);

    return res.json({
      message: 'File uploaded successfully',
      application,
      service: service || null,
      version,
      path: relativePath,
      checksum,
    });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return res.status(400).json({ error: (err as Error).message });
  }
});

export default router;