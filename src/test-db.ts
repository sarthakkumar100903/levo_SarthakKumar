//file for testing database upload
import db from './db';

const stmt = db.prepare('INSERT OR IGNORE INTO application (name) VALUES (?)');
stmt.run('ecommerce');

const apps = db.prepare('SELECT * FROM application').all();
console.log('Applications:', apps);
