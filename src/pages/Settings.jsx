import { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const Settings = () => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // General Settings
    general: {
      libraryName: 'Library Management System',
      address: '',
      phone: '',
      email: '',
      website: '',
      autoBackup: true,
      backupInterval: '24', // hours
      theme: 'light',
      language: 'en'
    },
    // Membership Settings
    membership: {
      defaultMembershipDuration: '12', // months
      membershipFee: '500',
      lateFeePerDay: '10',
      maxBooksPerMember: '3',
      maxRenewalDays: '15',
      requireDeposit: false,
      depositAmount: '200'
    },
    // Attendance Settings
    attendance: {
      autoMarkAbsent: true,
      absentAfterHours: '2',
      allowManualEdit: true,
      notifyOnAbsence: false,
      maxConsecutiveAbsences: '7'
    },
    // Payment Settings
    payment: {
      currency: 'INR',
      allowPartialPayments: true,
      paymentReminderDays: '7',
      autoGenerateReceipts: true,
      acceptCash: true,
      acceptOnline: false,
      onlinePaymentGateway: 'none'
    },
    // Notification Settings
    notifications: {
      enableDesktopNotifications: true,
      enableEmailNotifications: false,
      enableSMSNotifications: false,
      membershipExpiryReminder: true,
      reminderDaysBefore: '7',
      birthdayWishes: true
    },
    // Security Settings
    security: {
      sessionTimeout: '60', // minutes
      requirePasswordChange: false,
      passwordChangeInterval: '90', // days
      enableBiometric: false,
      twoFactorAuth: false,
      logUserActions: true
    },
    // Backup & Data Settings
    backup: {
      autoBackup: true,
      backupLocation: 'local',
      backupFrequency: 'daily',
      keepBackupsFor: '30', // days
      cloudBackup: false,
      cloudProvider: 'none'
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (window.api?.settings?.getSettings) {
        const savedSettings = await window.api.settings.getSettings();
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings }));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      if (window.api?.settings?.saveSettings) {
        await window.api.settings.saveSettings(settings);
        showNotification('Settings saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings({
        general: {
          libraryName: 'Library Management System',
          address: '',
          phone: '',
          email: '',
          website: '',
          autoBackup: true,
          backupInterval: '24',
          theme: 'light',
          language: 'en'
        },
        membership: {
          defaultMembershipDuration: '12',
          membershipFee: '500',
          lateFeePerDay: '10',
          maxBooksPerMember: '3',
          maxRenewalDays: '15',
          requireDeposit: false,
          depositAmount: '200'
        },
        attendance: {
          autoMarkAbsent: true,
          absentAfterHours: '2',
          allowManualEdit: true,
          notifyOnAbsence: false,
          maxConsecutiveAbsences: '7'
        },
        payment: {
          currency: 'INR',
          allowPartialPayments: true,
          paymentReminderDays: '7',
          autoGenerateReceipts: true,
          acceptCash: true,
          acceptOnline: false,
          onlinePaymentGateway: 'none'
        },
        notifications: {
          enableDesktopNotifications: true,
          enableEmailNotifications: false,
          enableSMSNotifications: false,
          membershipExpiryReminder: true,
          reminderDaysBefore: '7',
          birthdayWishes: true
        },
        security: {
          sessionTimeout: '60',
          requirePasswordChange: false,
          passwordChangeInterval: '90',
          enableBiometric: false,
          twoFactorAuth: false,
          logUserActions: true
        },
        backup: {
          autoBackup: true,
          backupLocation: 'local',
          backupFrequency: 'daily',
          keepBackupsFor: '30',
          cloudBackup: false,
          cloudProvider: 'none'
        }
      });
      showNotification('Settings reset to defaults', 'info');
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      if (window.api?.backup?.createBackup) {
        await window.api.backup.createBackup();
        showNotification('Backup created successfully', 'success');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      showNotification('Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async () => {
    if (confirm('Are you sure you want to restore from backup? This will replace all current data.')) {
      setLoading(true);
      try {
        if (window.api?.backup?.restoreBackup) {
          await window.api.backup.restoreBackup();
          showNotification('Backup restored successfully', 'success');
        }
      } catch (error) {
        console.error('Error restoring backup:', error);
        showNotification('Failed to restore backup', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const exportData = async () => {
    setLoading(true);
    try {
      if (window.api?.data?.exportData) {
        await window.api.data.exportData();
        showNotification('Data exported successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showNotification('Failed to export data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'membership', label: 'Membership', icon: '👥' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'payment', label: 'Payment', icon: '💰' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'backup', label: 'Backup & Data', icon: '💾' }
  ];

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>Library Information</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Library Name</label>
          <input
            type="text"
            value={settings.general.libraryName}
            onChange={(e) => handleSettingChange('general', 'libraryName', e.target.value)}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Address</label>
          <textarea
            value={settings.general.address}
            onChange={(e) => handleSettingChange('general', 'address', e.target.value)}
            className="form-control"
            rows="3"
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={settings.general.phone}
            onChange={(e) => handleSettingChange('general', 'phone', e.target.value)}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={settings.general.email}
            onChange={(e) => handleSettingChange('general', 'email', e.target.value)}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Website</label>
          <input
            type="url"
            value={settings.general.website}
            onChange={(e) => handleSettingChange('general', 'website', e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      <h3>Application Settings</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Theme</label>
          <select
            value={settings.general.theme}
            onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
            className="form-control"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="form-group">
          <label>Language</label>
          <select
            value={settings.general.language}
            onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
            className="form-control"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.general.autoBackup}
              onChange={(e) => handleSettingChange('general', 'autoBackup', e.target.checked)}
            />
            Enable Auto Backup
          </label>
        </div>
        <div className="form-group">
          <label>Backup Interval (hours)</label>
          <input
            type="number"
            value={settings.general.backupInterval}
            onChange={(e) => handleSettingChange('general', 'backupInterval', e.target.value)}
            className="form-control"
            min="1"
            max="168"
          />
        </div>
      </div>
    </div>
  );

  const renderMembershipSettings = () => (
    <div className="settings-section">
      <h3>Membership Configuration</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Default Membership Duration (months)</label>
          <input
            type="number"
            value={settings.membership.defaultMembershipDuration}
            onChange={(e) => handleSettingChange('membership', 'defaultMembershipDuration', e.target.value)}
            className="form-control"
            min="1"
            max="60"
          />
        </div>
        <div className="form-group">
          <label>Membership Fee (₹)</label>
          <input
            type="number"
            value={settings.membership.membershipFee}
            onChange={(e) => handleSettingChange('membership', 'membershipFee', e.target.value)}
            className="form-control"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Late Fee Per Day (₹)</label>
          <input
            type="number"
            value={settings.membership.lateFeePerDay}
            onChange={(e) => handleSettingChange('membership', 'lateFeePerDay', e.target.value)}
            className="form-control"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Max Books Per Member</label>
          <input
            type="number"
            value={settings.membership.maxBooksPerMember}
            onChange={(e) => handleSettingChange('membership', 'maxBooksPerMember', e.target.value)}
            className="form-control"
            min="1"
            max="20"
          />
        </div>
        <div className="form-group">
          <label>Max Renewal Days</label>
          <input
            type="number"
            value={settings.membership.maxRenewalDays}
            onChange={(e) => handleSettingChange('membership', 'maxRenewalDays', e.target.value)}
            className="form-control"
            min="1"
            max="90"
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.membership.requireDeposit}
              onChange={(e) => handleSettingChange('membership', 'requireDeposit', e.target.checked)}
            />
            Require Security Deposit
          </label>
        </div>
        <div className="form-group">
          <label>Deposit Amount (₹)</label>
          <input
            type="number"
            value={settings.membership.depositAmount}
            onChange={(e) => handleSettingChange('membership', 'depositAmount', e.target.value)}
            className="form-control"
            min="0"
            disabled={!settings.membership.requireDeposit}
          />
        </div>
      </div>
    </div>
  );

  const renderAttendanceSettings = () => (
    <div className="settings-section">
      <h3>Attendance Configuration</h3>
      <div className="form-grid">
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.attendance.autoMarkAbsent}
              onChange={(e) => handleSettingChange('attendance', 'autoMarkAbsent', e.target.checked)}
            />
            Auto Mark Absent After Specified Hours
          </label>
        </div>
        <div className="form-group">
          <label>Mark Absent After (hours)</label>
          <input
            type="number"
            value={settings.attendance.absentAfterHours}
            onChange={(e) => handleSettingChange('attendance', 'absentAfterHours', e.target.value)}
            className="form-control"
            min="1"
            max="24"
            disabled={!settings.attendance.autoMarkAbsent}
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.attendance.allowManualEdit}
              onChange={(e) => handleSettingChange('attendance', 'allowManualEdit', e.target.checked)}
            />
            Allow Manual Attendance Edit
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.attendance.notifyOnAbsence}
              onChange={(e) => handleSettingChange('attendance', 'notifyOnAbsence', e.target.checked)}
            />
            Notify on Absence
          </label>
        </div>
        <div className="form-group">
          <label>Max Consecutive Absences</label>
          <input
            type="number"
            value={settings.attendance.maxConsecutiveAbsences}
            onChange={(e) => handleSettingChange('attendance', 'maxConsecutiveAbsences', e.target.value)}
            className="form-control"
            min="1"
            max="30"
          />
        </div>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="settings-section">
      <h3>Payment Configuration</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Currency</label>
          <select
            value={settings.payment.currency}
            onChange={(e) => handleSettingChange('payment', 'currency', e.target.value)}
            className="form-control"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.payment.allowPartialPayments}
              onChange={(e) => handleSettingChange('payment', 'allowPartialPayments', e.target.checked)}
            />
            Allow Partial Payments
          </label>
        </div>
        <div className="form-group">
          <label>Payment Reminder (days before due)</label>
          <input
            type="number"
            value={settings.payment.paymentReminderDays}
            onChange={(e) => handleSettingChange('payment', 'paymentReminderDays', e.target.value)}
            className="form-control"
            min="1"
            max="30"
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.payment.autoGenerateReceipts}
              onChange={(e) => handleSettingChange('payment', 'autoGenerateReceipts', e.target.checked)}
            />
            Auto Generate Receipts
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.payment.acceptCash}
              onChange={(e) => handleSettingChange('payment', 'acceptCash', e.target.checked)}
            />
            Accept Cash Payments
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.payment.acceptOnline}
              onChange={(e) => handleSettingChange('payment', 'acceptOnline', e.target.checked)}
            />
            Accept Online Payments
          </label>
        </div>
        <div className="form-group">
          <label>Online Payment Gateway</label>
          <select
            value={settings.payment.onlinePaymentGateway}
            onChange={(e) => handleSettingChange('payment', 'onlinePaymentGateway', e.target.value)}
            className="form-control"
            disabled={!settings.payment.acceptOnline}
          >
            <option value="none">None</option>
            <option value="razorpay">Razorpay</option>
            <option value="paytm">Paytm</option>
            <option value="phonepe">PhonePe</option>
            <option value="googlepay">Google Pay</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>Notification Preferences</h3>
      <div className="form-grid">
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.notifications.enableDesktopNotifications}
              onChange={(e) => handleSettingChange('notifications', 'enableDesktopNotifications', e.target.checked)}
            />
            Enable Desktop Notifications
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.notifications.enableEmailNotifications}
              onChange={(e) => handleSettingChange('notifications', 'enableEmailNotifications', e.target.checked)}
            />
            Enable Email Notifications
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.notifications.enableSMSNotifications}
              onChange={(e) => handleSettingChange('notifications', 'enableSMSNotifications', e.target.checked)}
            />
            Enable SMS Notifications
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.notifications.membershipExpiryReminder}
              onChange={(e) => handleSettingChange('notifications', 'membershipExpiryReminder', e.target.checked)}
            />
            Membership Expiry Reminders
          </label>
        </div>
        <div className="form-group">
          <label>Reminder Days Before Expiry</label>
          <input
            type="number"
            value={settings.notifications.reminderDaysBefore}
            onChange={(e) => handleSettingChange('notifications', 'reminderDaysBefore', e.target.value)}
            className="form-control"
            min="1"
            max="30"
            disabled={!settings.notifications.membershipExpiryReminder}
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.notifications.birthdayWishes}
              onChange={(e) => handleSettingChange('notifications', 'birthdayWishes', e.target.checked)}
            />
            Send Birthday Wishes
          </label>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3>Security Configuration</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => handleSettingChange('security', 'sessionTimeout', e.target.value)}
            className="form-control"
            min="5"
            max="480"
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.security.requirePasswordChange}
              onChange={(e) => handleSettingChange('security', 'requirePasswordChange', e.target.checked)}
            />
            Require Periodic Password Change
          </label>
        </div>
        <div className="form-group">
          <label>Password Change Interval (days)</label>
          <input
            type="number"
            value={settings.security.passwordChangeInterval}
            onChange={(e) => handleSettingChange('security', 'passwordChangeInterval', e.target.value)}
            className="form-control"
            min="30"
            max="365"
            disabled={!settings.security.requirePasswordChange}
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.security.enableBiometric}
              onChange={(e) => handleSettingChange('security', 'enableBiometric', e.target.checked)}
            />
            Enable Biometric Authentication
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.security.twoFactorAuth}
              onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
            />
            Enable Two-Factor Authentication
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.security.logUserActions}
              onChange={(e) => handleSettingChange('security', 'logUserActions', e.target.checked)}
            />
            Log User Actions
          </label>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="settings-section">
      <h3>Backup Configuration</h3>
      <div className="form-grid">
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.backup.autoBackup}
              onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
            />
            Enable Auto Backup
          </label>
        </div>
        <div className="form-group">
          <label>Backup Frequency</label>
          <select
            value={settings.backup.backupFrequency}
            onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
            className="form-control"
            disabled={!settings.backup.autoBackup}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="form-group">
          <label>Keep Backups For (days)</label>
          <input
            type="number"
            value={settings.backup.keepBackupsFor}
            onChange={(e) => handleSettingChange('backup', 'keepBackupsFor', e.target.value)}
            className="form-control"
            min="1"
            max="365"
          />
        </div>
        <div className="form-group">
          <label>Backup Location</label>
          <select
            value={settings.backup.backupLocation}
            onChange={(e) => handleSettingChange('backup', 'backupLocation', e.target.value)}
            className="form-control"
          >
            <option value="local">Local Storage</option>
            <option value="external">External Drive</option>
            <option value="network">Network Drive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.backup.cloudBackup}
              onChange={(e) => handleSettingChange('backup', 'cloudBackup', e.target.checked)}
            />
            Enable Cloud Backup
          </label>
        </div>
        <div className="form-group">
          <label>Cloud Provider</label>
          <select
            value={settings.backup.cloudProvider}
            onChange={(e) => handleSettingChange('backup', 'cloudProvider', e.target.value)}
            className="form-control"
            disabled={!settings.backup.cloudBackup}
          >
            <option value="none">None</option>
            <option value="google">Google Drive</option>
            <option value="dropbox">Dropbox</option>
            <option value="onedrive">OneDrive</option>
            <option value="aws">AWS S3</option>
          </select>
        </div>
      </div>

      <h3>Data Management</h3>
      <div className="action-buttons">
        <button 
          onClick={createBackup} 
          className="button button-primary"
          disabled={loading}
        >
          🔄 Create Backup Now
        </button>
        <button 
          onClick={restoreBackup} 
          className="button button-secondary"
          disabled={loading}
        >
          📥 Restore from Backup
        </button>
        <button 
          onClick={exportData} 
          className="button button-info"
          disabled={loading}
        >
          📤 Export Data
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'membership':
        return renderMembershipSettings();
      case 'attendance':
        return renderAttendanceSettings();
      case 'payment':
        return renderPaymentSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'backup':
        return renderBackupSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p>Configure your library management system</p>
      </div>

      <div className="settings-content">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-panel">
          {renderTabContent()}

          <div className="settings-actions">
            <button 
              onClick={saveSettings} 
              className="button button-primary"
              disabled={loading}
            >
              {loading ? '💾 Saving...' : '💾 Save Settings'}
            </button>
            <button 
              onClick={resetToDefaults} 
              className="button button-secondary"
              disabled={loading}
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .settings-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .settings-header h1 {
          margin: 0 0 0.5rem 0;
          color: #2d3748;
        }

        .settings-header p {
          margin: 0;
          color: #718096;
        }

        .settings-content {
          display: flex;
          gap: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .settings-tabs {
          background: #f7fafc;
          min-width: 250px;
          padding: 1rem 0;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .tab-button:hover {
          background: #e2e8f0;
        }

        .tab-button.active {
          background: #4299e1;
          color: white;
        }

        .tab-icon {
          font-size: 1.2rem;
        }

        .settings-panel {
          flex: 1;
          padding: 2rem;
        }

        .settings-section h3 {
          margin: 0 0 1.5rem 0;
          color: #2d3748;
          font-size: 1.2rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #4a5568;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-direction: row !important;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          margin: 0;
        }

        .form-control {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }

        .form-control:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        .form-control:disabled {
          background: #f7fafc;
          color: #a0aec0;
          cursor: not-allowed;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 2rem;
        }

        .button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .button-primary {
          background: #4299e1;
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          background: #3182ce;
        }

        .button-secondary {
          background: #e2e8f0;
          color: #4a5568;
        }

        .button-secondary:hover:not(:disabled) {
          background: #cbd5e0;
        }

        .button-info {
          background: #38b2ac;
          color: white;
        }

        .button-info:hover:not(:disabled) {
          background: #319795;
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .settings-content {
            flex-direction: column;
          }

          .settings-tabs {
            min-width: auto;
            display: flex;
            overflow-x: auto;
            padding: 0.5rem;
          }

          .tab-button {
            white-space: nowrap;
            min-width: auto;
            padding: 0.5rem 1rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .settings-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
