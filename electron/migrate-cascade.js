const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'library.db'));

console.log('Starting database migration to add CASCADE DELETE...');

// Enable foreign keys
db.pragma('foreign_keys = OFF');

// Start transaction
const transaction = db.transaction(() => {
  console.log('Backing up data...');
  
  // Create temporary tables to backup data
  db.exec(`
    -- Backup existing data
    CREATE TEMP TABLE payments_backup AS SELECT * FROM payments;
    CREATE TEMP TABLE attendance_backup AS SELECT * FROM attendance;
    CREATE TEMP TABLE notifications_backup AS SELECT * FROM notifications;
    
    -- Drop existing tables
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS attendance;
    DROP TABLE IF EXISTS notifications;
  `);
  
  console.log('Recreating tables with CASCADE DELETE...');
  
  // Recreate tables with CASCADE DELETE
  db.prepare(`
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      mode TEXT DEFAULT 'cash' CHECK(mode IN ('cash', 'card', 'upi', 'bank_transfer')),
      plan_id INTEGER,
      note TEXT,
      receipt_number TEXT,
      paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES membership_plans (id),
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `).run();
  
  db.prepare(`
    CREATE TABLE attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      check_in TEXT DEFAULT CURRENT_TIMESTAMP,
      check_out TEXT,
      source TEXT DEFAULT 'manual' CHECK(source IN ('biometric', 'manual', 'card', 'qr')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
    )
  `).run();
  
  db.prepare(`
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('email', 'whatsapp', 'sms')),
      subject TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
      sent_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
    )
  `).run();
  
  console.log('Restoring data...');
  
  // Restore data
  db.exec(`
    INSERT INTO payments SELECT * FROM payments_backup;
    INSERT INTO attendance SELECT * FROM attendance_backup;
    INSERT INTO notifications SELECT * FROM notifications_backup;
    
    -- Clean up temp tables
    DROP TABLE payments_backup;
    DROP TABLE attendance_backup;
    DROP TABLE notifications_backup;
  `);
});

try {
  transaction();
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

db.close();
console.log('Database migration finished.');
