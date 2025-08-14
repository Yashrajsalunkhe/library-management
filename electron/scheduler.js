const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { db } = require('./db');
const NotificationService = require('./notifier');

class SchedulerService {
  constructor() {
    this.notifier = new NotificationService();
    this.isRunning = false;
    this.tasks = []; // Store task references
  }

  start() {
    if (this.isRunning) {
      console.log('Scheduler already running');
      return;
    }

    console.log('Starting scheduler service...');
    this.isRunning = true;

    // Daily task at 9:00 AM - Send expiry reminders
    const reminderTask = cron.schedule('0 9 * * *', async () => {
      console.log('Running daily expiry reminder task...');
      try {
        const results = await this.notifier.sendBulkExpiryReminders();
        console.log(`Sent expiry reminders to ${results.length} members`);
      } catch (error) {
        console.error('Error in daily reminder task:', error);
      }
    });
    this.tasks.push(reminderTask);

    // Daily task at 2:00 AM - Database backup
    const backupTask = cron.schedule('0 2 * * *', async () => {
      console.log('Running daily database backup...');
      try {
        await this.createDatabaseBackup();
      } catch (error) {
        console.error('Error in database backup task:', error);
      }
    });
    this.tasks.push(backupTask);

    // Weekly task on Sunday at 1:00 AM - Cleanup old notifications
    const cleanupTask = cron.schedule('0 1 * * 0', async () => {
      console.log('Running weekly cleanup task...');
      try {
        await this.cleanupOldNotifications();
      } catch (error) {
        console.error('Error in cleanup task:', error);
      }
    });
    this.tasks.push(cleanupTask);

    // Update member statuses every hour
    const statusTask = cron.schedule('0 * * * *', async () => {
      try {
        await this.updateMemberStatuses();
      } catch (error) {
        console.error('Error updating member statuses:', error);
      }
    });
    this.tasks.push(statusTask);

    console.log('Scheduler service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping scheduler service...');
    
    // Stop all individual tasks
    this.tasks.forEach(task => {
      if (task && typeof task.stop === 'function') {
        task.stop();
      } else if (task && typeof task.destroy === 'function') {
        task.destroy();
      }
    });
    
    this.tasks = [];
    this.isRunning = false;
    console.log('Scheduler service stopped');
  }

  // Create database backup
  async createDatabaseBackup() {
    try {
      const backupDir = path.join(__dirname, '../backups');
      
      // Create backup directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupPath = path.join(backupDir, `library-backup-${timestamp}.db`);
      const sourcePath = path.join(__dirname, 'library.db');

      // Copy database file
      fs.copyFileSync(sourcePath, backupPath);

      // Keep only last 30 days of backups
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('library-backup-'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          time: fs.statSync(path.join(backupDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      // Remove old backups (keep last 30)
      files.slice(30).forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Removed old backup: ${file.name}`);
      });

      console.log(`Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  // Update member statuses based on expiry dates
  async updateMemberStatuses() {
    try {
      const stmt = db.prepare(`
        UPDATE members 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active' AND DATE(end_date) < DATE('now')
      `);
      
      const result = stmt.run();
      
      if (result.changes > 0) {
        console.log(`Updated ${result.changes} expired members`);
      }
    } catch (error) {
      console.error('Error updating member statuses:', error);
      throw error;
    }
  }

  // Cleanup old notifications (older than 90 days)
  async cleanupOldNotifications() {
    try {
      const stmt = db.prepare(`
        DELETE FROM notifications 
        WHERE DATE(created_at) < DATE('now', '-90 days')
      `);
      
      const result = stmt.run();
      console.log(`Cleaned up ${result.changes} old notifications`);
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  }

  // Manual backup trigger
  async triggerBackup() {
    console.log('Manual backup triggered...');
    return await this.createDatabaseBackup();
  }

  // Manual expiry reminder trigger
  async triggerExpiryReminders() {
    console.log('Manual expiry reminders triggered...');
    return await this.notifier.sendBulkExpiryReminders();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: [
        {
          name: 'Daily Expiry Reminders',
          schedule: '9:00 AM daily',
          description: 'Send expiry reminder notifications to members'
        },
        {
          name: 'Database Backup',
          schedule: '2:00 AM daily',
          description: 'Create automatic database backup'
        },
        {
          name: 'Cleanup Old Notifications',
          schedule: '1:00 AM every Sunday',
          description: 'Remove notifications older than 90 days'
        },
        {
          name: 'Update Member Statuses',
          schedule: 'Every hour',
          description: 'Update expired member statuses'
        }
      ]
    };
  }

  // Generate daily summary report
  async generateDailySummary() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const stats = {
        date: today,
        attendance: db.prepare(`
          SELECT COUNT(*) as count FROM attendance 
          WHERE DATE(check_in) = ?
        `).get(today)?.count || 0,
        
        payments: db.prepare(`
          SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
          FROM payments 
          WHERE DATE(paid_at) = ?
        `).get(today),
        
        newMembers: db.prepare(`
          SELECT COUNT(*) as count FROM members 
          WHERE DATE(created_at) = ?
        `).get(today)?.count || 0,
        
        expiringTomorrow: db.prepare(`
          SELECT COUNT(*) as count FROM members 
          WHERE status = 'active' AND DATE(end_date) = DATE('now', '+1 day')
        `).get()?.count || 0
      };

      return stats;
    } catch (error) {
      console.error('Error generating daily summary:', error);
      throw error;
    }
  }
}

module.exports = SchedulerService;
