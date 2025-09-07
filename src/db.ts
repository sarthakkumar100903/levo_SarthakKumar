import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data folder exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// DB file
const dbPath = path.join(dataDir, 'schema.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
CREATE TABLE IF NOT EXISTS application (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    applicationId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, applicationId),
    FOREIGN KEY(applicationId) REFERENCES application(id)
);

CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    checksum TEXT NOT NULL,
    version INTEGER NOT NULL,
    applicationId INTEGER NOT NULL,
    serviceId INTEGER,
    path TEXT NOT NULL,  -- 👈 NEW COLUMN to store relative file path
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(applicationId) REFERENCES application(id),
    FOREIGN KEY(serviceId) REFERENCES service(id)
);
`);

export default db;
