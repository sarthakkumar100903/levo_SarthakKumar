import db from './db';

// Insert an application
const stmt = db.prepare('INSERT OR IGNORE INTO application (name) VALUES (?)');
stmt.run('ecommerce');

// Fetch apps
const apps = db.prepare('SELECT * FROM application').all();
console.log('Applications:', apps);
