// routes/schema.ts
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db';

const router = Router();

// Types for DB rows
interface ApplicationRow { id: number }
interface ServiceRow { id: number }
interface VersionRow {
  id: number;
  applicationId: number;
  serviceId: number | null;
  version: number;
  filename: string;
  checksum: string;
  path: string;
  createdAt?: string; // 👈 correct column name
}

router.get('/schema', (req: Request, res: Response) => {
  try {
    const application = String(req.query.application || '').trim();
    const service = req.query.service ? String(req.query.service).trim() : null;
    const versionQ = req.query.version ? String(req.query.version).trim() : 'latest';

    if (!application) return res.status(400).json({ error: 'application query param is required' });

    const appRow = db.prepare('SELECT id FROM application WHERE name = ?').get(application) as ApplicationRow | undefined;
    if (!appRow) return res.status(404).json({ error: 'application not found' });

    let serviceId: number | null = null;
    if (service) {
      const srow = db.prepare('SELECT id FROM service WHERE name = ? AND applicationId = ?').get(service, appRow.id) as ServiceRow | undefined;
      if (!srow) return res.status(404).json({ error: 'service not found' });
      serviceId = srow.id;
    }

    // determine version
    let versionNumber: number | null = null;
    if (versionQ === 'latest') {
      const r = service
        ? (db.prepare('SELECT MAX(version) as v FROM schema_version WHERE applicationId = ? AND serviceId = ?').get(appRow.id, serviceId) as { v: number } | undefined)
        : (db.prepare('SELECT MAX(version) as v FROM schema_version WHERE applicationId = ? AND serviceId IS NULL').get(appRow.id) as { v: number } | undefined);

      versionNumber = r?.v || null;
      if (!versionNumber) return res.status(404).json({ error: 'no schema versions found for this app/service' });
    } else {
      const parsed = parseInt(versionQ, 10);
      if (isNaN(parsed) || parsed <= 0) return res.status(400).json({ error: 'invalid version number' });
      versionNumber = parsed;
    }

    // fetch metadata row
    const meta = service
      ? (db.prepare('SELECT * FROM schema_version WHERE applicationId = ? AND serviceId = ? AND version = ?').get(appRow.id, serviceId, versionNumber) as VersionRow | undefined)
      : (db.prepare('SELECT * FROM schema_version WHERE applicationId = ? AND serviceId IS NULL AND version = ?').get(appRow.id, versionNumber) as VersionRow | undefined);

    if (!meta) return res.status(404).json({ error: 'schema version not found' });

    const absPath = path.join(process.cwd(), meta.path);
    if (!fs.existsSync(absPath)) return res.status(500).json({ error: 'schema file missing on disk' });

    const content = fs.readFileSync(absPath, 'utf8');

    return res.json({
      application,
      service,
      version: meta.version,
      filename: meta.filename,
      checksum: meta.checksum,
      createdAt: meta.createdAt || null,
      spec: content,
    });
  } catch (err) {
    console.error('GET /schema error', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

router.get('/schema/versions', (req: Request, res: Response) => {
  try {
    const application = String(req.query.application || '').trim();
    const service = req.query.service ? String(req.query.service).trim() : null;

    if (!application) return res.status(400).json({ error: 'application query param is required' });

    const appRow = db.prepare('SELECT id FROM application WHERE name = ?').get(application) as ApplicationRow | undefined;
    if (!appRow) return res.status(404).json({ error: 'application not found' });

    let rows: Pick<VersionRow, 'version' | 'filename' | 'checksum' | 'createdAt'>[] = [];

    if (service) {
      const srow = db.prepare('SELECT id FROM service WHERE name = ? AND applicationId = ?').get(service, appRow.id) as ServiceRow | undefined;
      if (!srow) return res.status(404).json({ error: 'service not found' });
      rows = db.prepare(
        'SELECT version, filename, checksum, createdAt FROM schema_version WHERE applicationId = ? AND serviceId = ? ORDER BY version DESC'
      ).all(appRow.id, srow.id) as VersionRow[];
    } else {
      rows = db.prepare(
        'SELECT version, filename, checksum, createdAt FROM schema_version WHERE applicationId = ? AND serviceId IS NULL ORDER BY version DESC'
      ).all(appRow.id) as VersionRow[];
    }

    return res.json({ application, service, versions: rows || [] });
  } catch (err) {
    console.error('GET /schema/versions error', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
