import db from '../src/db'; // adjust path if db.ts is in src/ or root

const rows = db.prepare(
  'SELECT id, applicationId, serviceId, version, filename, path FROM schema_version'
).all();

console.log('Schemas in DB:');
console.log(rows);
