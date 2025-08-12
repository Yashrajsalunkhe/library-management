const { db, query, get, run, transaction } = require('./db');
const bcrypt = require('bcryptjs');
const { format, addDays, parseISO } = require('date-fns');

module.exports = (ipcMain) => {
  // ===================
  // AUTHENTICATION
  // ===================
  
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      const user = get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
      
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Update last login
      run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.full_name
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // MEMBERS MANAGEMENT
  // ===================
  
  ipcMain.handle('member:add', async (event, member) => {
    try {
      const result = transaction(() => {
        // Generate QR code data
        const qrData = `LMS-${Date.now()}`;
        
        const info = run(`
          INSERT INTO members (name, email, phone, address, plan_id, join_date, end_date, qr_code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          member.name,
          member.email,
          member.phone,
          member.address,
          member.planId,
          member.joinDate,
          member.endDate,
          qrData
        ]);

        return { id: info.lastInsertRowid, qrCode: qrData };
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('member:list', async (event, filters = {}) => {
    try {
      let sql = `
        SELECT m.*, mp.name as plan_name, mp.price as plan_price
        FROM members m
        LEFT JOIN membership_plans mp ON m.plan_id = mp.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        sql += ' AND m.status = ?';
        params.push(filters.status);
      }

      if (filters.search) {
        sql += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      sql += ' ORDER BY m.created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const members = query(sql, params);
      return { success: true, data: members };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('member:get', async (event, id) => {
    try {
      const member = get(`
        SELECT m.*, mp.name as plan_name, mp.price as plan_price, mp.duration_days
        FROM members m
        LEFT JOIN membership_plans mp ON m.plan_id = mp.id
        WHERE m.id = ?
      `, [id]);

      if (!member) {
        return { success: false, message: 'Member not found' };
      }

      return { success: true, data: member };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('member:update', async (event, { id, ...updates }) => {
    try {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      run(`UPDATE members SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
      
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('member:delete', async (event, id) => {
    try {
      run('UPDATE members SET status = ? WHERE id = ?', ['suspended', id]);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('member:renew', async (event, { memberId, planId, paymentDetails }) => {
    try {
      const result = transaction(() => {
        // Get current member and new plan details
        const member = get('SELECT * FROM members WHERE id = ?', [memberId]);
        const plan = get('SELECT * FROM membership_plans WHERE id = ?', [planId]);
        
        if (!member || !plan) {
          throw new Error('Member or plan not found');
        }

        // Calculate new end date
        const currentEndDate = new Date(member.end_date);
        const today = new Date();
        const startDate = currentEndDate > today ? currentEndDate : today;
        const newEndDate = addDays(startDate, plan.duration_days);

        // Update member
        run(`
          UPDATE members 
          SET plan_id = ?, end_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [planId, format(newEndDate, 'yyyy-MM-dd'), memberId]);

        // Add payment record
        const paymentInfo = run(`
          INSERT INTO payments (member_id, amount, mode, plan_id, note, receipt_number)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          memberId,
          plan.price,
          paymentDetails.mode,
          planId,
          paymentDetails.note || 'Membership renewal',
          `RCP-${Date.now()}`
        ]);

        return { 
          paymentId: paymentInfo.lastInsertRowid,
          newEndDate: format(newEndDate, 'yyyy-MM-dd')
        };
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // MEMBERSHIP PLANS
  // ===================
  
  ipcMain.handle('plan:list', async () => {
    try {
      const plans = query('SELECT * FROM membership_plans ORDER BY duration_days');
      return { success: true, data: plans };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('plan:add', async (event, plan) => {
    try {
      const info = run(`
        INSERT INTO membership_plans (name, duration_days, price, description)
        VALUES (?, ?, ?, ?)
      `, [plan.name, plan.durationDays, plan.price, plan.description]);

      return { success: true, data: { id: info.lastInsertRowid } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // PAYMENTS
  // ===================
  
  ipcMain.handle('payment:add', async (event, payment) => {
    try {
      const info = run(`
        INSERT INTO payments (member_id, amount, mode, note, receipt_number)
        VALUES (?, ?, ?, ?, ?)
      `, [
        payment.memberId,
        payment.amount,
        payment.mode,
        payment.note,
        payment.receiptNumber || `RCP-${Date.now()}`
      ]);

      return { success: true, data: { id: info.lastInsertRowid } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('payment:list', async (event, filters = {}) => {
    try {
      let sql = `
        SELECT p.*, m.name as member_name, mp.name as plan_name
        FROM payments p
        JOIN members m ON p.member_id = m.id
        LEFT JOIN membership_plans mp ON p.plan_id = mp.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.memberId) {
        sql += ' AND p.member_id = ?';
        params.push(filters.memberId);
      }

      if (filters.search) {
        sql += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ? OR p.receipt_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.mode) {
        sql += ' AND p.mode = ?';
        params.push(filters.mode);
      }

      if (filters.dateFrom) {
        sql += ' AND DATE(p.paid_at) >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        sql += ' AND DATE(p.paid_at) <= ?';
        params.push(filters.dateTo);
      }

      if (filters.planId) {
        sql += ' AND p.plan_id = ?';
        params.push(parseInt(filters.planId));
      }

      sql += ' ORDER BY p.paid_at DESC';

      const payments = query(sql, params);
      return { success: true, data: payments };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // ATTENDANCE
  // ===================
  
  ipcMain.handle('attendance:checkin', async (event, { memberId, source = 'manual' }) => {
    try {
      // Check if already checked in today
      const today = format(new Date(), 'yyyy-MM-dd');
      const existingEntry = get(`
        SELECT * FROM attendance 
        WHERE member_id = ? AND DATE(check_in) = ? AND check_out IS NULL
      `, [memberId, today]);

      if (existingEntry) {
        return { success: false, message: 'Already checked in today' };
      }

      const info = run(`
        INSERT INTO attendance (member_id, source)
        VALUES (?, ?)
      `, [memberId, source]);

      return { success: true, data: { id: info.lastInsertRowid } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('attendance:checkout', async (event, { memberId }) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = run(`
        UPDATE attendance 
        SET check_out = CURRENT_TIMESTAMP 
        WHERE member_id = ? AND DATE(check_in) = ? AND check_out IS NULL
      `, [memberId, today]);

      if (result.changes === 0) {
        return { success: false, message: 'No active check-in found for today' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('attendance:list', async (event, filters = {}) => {
    try {
      let sql = `
        SELECT a.*, m.name as member_name
        FROM attendance a
        JOIN members m ON a.member_id = m.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.date) {
        sql += ' AND DATE(a.check_in) = ?';
        params.push(filters.date);
      }

      if (filters.memberId) {
        sql += ' AND a.member_id = ?';
        params.push(filters.memberId);
      }

      if (filters.dateFrom && filters.dateTo) {
        sql += ' AND DATE(a.check_in) BETWEEN ? AND ?';
        params.push(filters.dateFrom, filters.dateTo);
      }

      sql += ' ORDER BY a.check_in DESC';

      const attendance = query(sql, params);
      return { success: true, data: attendance };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('attendance:today', async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendance = query(`
        SELECT a.*, m.name as member_name, m.phone
        FROM attendance a
        JOIN members m ON a.member_id = m.id
        WHERE DATE(a.check_in) = ?
        ORDER BY a.check_in DESC
      `, [today]);

      return { success: true, data: attendance };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // DASHBOARD STATS
  // ===================
  
  ipcMain.handle('dashboard:stats', async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thisMonth = format(new Date(), 'yyyy-MM');
      
      const stats = {
        totalMembers: get('SELECT COUNT(*) as count FROM members WHERE status = ?', ['active'])?.count || 0,
        todayAttendance: get('SELECT COUNT(*) as count FROM attendance WHERE DATE(check_in) = ?', [today])?.count || 0,
        todayIncome: get('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(paid_at) = ?', [today])?.total || 0,
        monthlyIncome: get('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE strftime(\'%Y-%m\', paid_at) = ?', [thisMonth])?.total || 0,
        expiringMembers: get(`
          SELECT COUNT(*) as count FROM members 
          WHERE status = ? AND DATE(end_date) <= DATE('now', '+10 days')
        `, ['active'])?.count || 0
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // REPORTS
  // ===================
  
  ipcMain.handle('report:attendance', async (event, { dateFrom, dateTo }) => {
    try {
      const attendance = query(`
        SELECT 
          m.name as member_name,
          m.phone,
          COUNT(a.id) as visit_count,
          MIN(a.check_in) as first_visit,
          MAX(a.check_in) as last_visit
        FROM members m
        LEFT JOIN attendance a ON m.id = a.member_id 
          AND DATE(a.check_in) BETWEEN ? AND ?
        WHERE m.status = ?
        GROUP BY m.id, m.name, m.phone
        ORDER BY visit_count DESC, m.name
      `, [dateFrom, dateTo, 'active']);

      return { success: true, data: attendance };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('report:payments', async (event, { dateFrom, dateTo }) => {
    try {
      const payments = query(`
        SELECT 
          DATE(p.paid_at) as payment_date,
          COUNT(p.id) as transaction_count,
          SUM(p.amount) as total_amount,
          p.mode,
          GROUP_CONCAT(m.name) as members
        FROM payments p
        JOIN members m ON p.member_id = m.id
        WHERE DATE(p.paid_at) BETWEEN ? AND ?
        GROUP BY DATE(p.paid_at), p.mode
        ORDER BY p.paid_at DESC
      `, [dateFrom, dateTo]);

      return { success: true, data: payments };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // ===================
  // SETTINGS
  // ===================
  
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = query('SELECT * FROM settings');
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      return { success: true, data: settingsObj };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('settings:update', async (event, settings) => {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      transaction(() => {
        Object.entries(settings).forEach(([key, value]) => {
          stmt.run(key, value);
        });
      });

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });
};
