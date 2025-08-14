const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(path.join(__dirname, 'library.db'));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(__dirname, 'library.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Membership plans table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Members table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      birth_date TEXT,
      city TEXT,
      address TEXT,
      seat_no TEXT UNIQUE,
      plan_id INTEGER,
      join_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'suspended')),
      fingerprint_template BLOB,
      qr_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES membership_plans (id)
    )
  `).run();

  // Payments table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS payments (
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

  // Attendance table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      check_in TEXT DEFAULT CURRENT_TIMESTAMP,
      check_out TEXT,
      source TEXT DEFAULT 'manual' CHECK(source IN ('biometric', 'manual', 'card', 'qr')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
    )
  `).run();

  // Users table (for receptionists/admin)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'receptionist' CHECK(role IN ('admin', 'receptionist')),
      full_name TEXT,
      email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `).run();

  // Notifications table (track sent notifications)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
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

  // Settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Migrate existing members table to add new columns
  try {
    // Check if new columns exist, if not add them
    const columns = db.prepare("PRAGMA table_info(members)").all();
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('birth_date')) {
      db.prepare('ALTER TABLE members ADD COLUMN birth_date TEXT').run();
    }
    if (!columnNames.includes('city')) {
      db.prepare('ALTER TABLE members ADD COLUMN city TEXT').run();
    }
    if (!columnNames.includes('seat_no')) {
      db.prepare('ALTER TABLE members ADD COLUMN seat_no TEXT UNIQUE').run();
    }
  } catch (error) {
    console.log('Migration skipped or already applied:', error.message);
  }

  // Insert default membership plans
  const planExists = db.prepare('SELECT COUNT(*) as count FROM membership_plans').get();
  if (planExists.count === 0) {
    const insertPlan = db.prepare('INSERT INTO membership_plans (name, duration_days, price, description) VALUES (?, ?, ?, ?)');
    insertPlan.run('Monthly', 30, 1000, 'Monthly membership plan');
    insertPlan.run('Quarterly', 90, 2700, 'Quarterly membership plan with 10% discount');
    insertPlan.run('Half Yearly', 180, 5000, 'Half yearly plan with 17% discount');
    insertPlan.run('Annual', 365, 9000, 'Annual plan with 25% discount');
  }

  // Insert default admin user (password: admin123)
  const userExists = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userExists.count === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)').run('admin', hashedPassword, 'admin', 'System Administrator');
  }

  // Insert default settings
  const settingsExist = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsExist.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)');
    insertSetting.run('library_name', 'Study Room Library', 'Name of the library');
    insertSetting.run('library_address', 'Main Street, City', 'Library address');
    insertSetting.run('library_phone', '+1234567890', 'Library contact number');
    insertSetting.run('notification_days', '10', 'Days before expiry to send notifications');
    insertSetting.run('auto_backup', '1', 'Enable automatic database backup');
  }
};

// Initialize tables
createTables();

// Run migrations for existing databases
const runMigrations = () => {
  try {
    // Check if new columns exist in members table
    const tableInfo = db.prepare("PRAGMA table_info(members)").all();
    const columnNames = tableInfo.map(col => col.name);
    
    // Add missing columns one by one (without UNIQUE constraint first)
    const columnsToAdd = [
      { name: 'birth_date', sql: 'ALTER TABLE members ADD COLUMN birth_date TEXT' },
      { name: 'city', sql: 'ALTER TABLE members ADD COLUMN city TEXT' },
      { name: 'seat_no', sql: 'ALTER TABLE members ADD COLUMN seat_no TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        try {
          db.prepare(column.sql).run();
          console.log(`Successfully added column: ${column.name}`);
        } catch (error) {
          if (error.message.includes('duplicate column name')) {
            console.log(`Column ${column.name} already exists, skipping...`);
          } else {
            console.error(`Error adding column ${column.name}:`, error.message);
          }
        }
      }
    }
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Run migrations
runMigrations();

// Helper functions for common database operations
const dbHelpers = {
  // Generic query helper
  query: (sql, params = []) => {
    try {
      return db.prepare(sql).all(params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Generic single row helper
  get: (sql, params = []) => {
    try {
      return db.prepare(sql).get(params);
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  },

  // Generic insert/update helper
  run: (sql, params = []) => {
    try {
      return db.prepare(sql).run(params);
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  },

  // Transaction helper
  transaction: (callback) => {
    const transaction = db.transaction(callback);
    return transaction();
  }
};

module.exports = { db, ...dbHelpers };
