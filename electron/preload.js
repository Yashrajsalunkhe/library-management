const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Authentication
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials)
  },

  // Members
  member: {
    add: (member) => ipcRenderer.invoke('member:add', member),
    list: (filters) => ipcRenderer.invoke('member:list', filters),
    get: (id) => ipcRenderer.invoke('member:get', id),
    update: (member) => ipcRenderer.invoke('member:update', member),
    delete: (id) => ipcRenderer.invoke('member:delete', id),
    renew: (renewal) => ipcRenderer.invoke('member:renew', renewal)
  },

  // Membership Plans
  plan: {
    list: () => ipcRenderer.invoke('plan:list'),
    add: (plan) => ipcRenderer.invoke('plan:add', plan)
  },

  // Payments
  payment: {
    add: (payment) => ipcRenderer.invoke('payment:add', payment),
    list: (filters) => ipcRenderer.invoke('payment:list', filters)
  },

  // Attendance
  attendance: {
    checkin: (data) => ipcRenderer.invoke('attendance:checkin', data),
    checkout: (data) => ipcRenderer.invoke('attendance:checkout', data),
    list: (filters) => ipcRenderer.invoke('attendance:list', filters),
    today: () => ipcRenderer.invoke('attendance:today'),
    add: (attendance) => ipcRenderer.invoke('attendance:add', attendance)
  },

  // Dashboard
  dashboard: {
    stats: () => ipcRenderer.invoke('dashboard:stats')
  },

  // Reports
  report: {
    attendance: (filters) => ipcRenderer.invoke('report:attendance', filters),
    payments: (filters) => ipcRenderer.invoke('report:payments', filters),
    export: (options) => ipcRenderer.invoke('report:export', options),
    exportAttendance: (options) => ipcRenderer.invoke('report:export-attendance', options),
    exportPayments: (options) => ipcRenderer.invoke('report:export-payments', options),
    exportMembers: (options) => ipcRenderer.invoke('report:export-members', options),
    generateReceipt: (options) => ipcRenderer.invoke('report:generate-receipt', options)
  },

  // Notifications
  notification: {
    sendExpiryReminders: () => ipcRenderer.invoke('notification:send-expiry-reminders'),
    sendWelcome: (memberData) => ipcRenderer.invoke('notification:send-welcome', memberData)
  },

  // Biometric
  biometric: {
    status: () => ipcRenderer.invoke('biometric:status'),
    startScan: () => ipcRenderer.invoke('biometric:start-scan'),
    stopScan: () => ipcRenderer.invoke('biometric:stop-scan'),
    enroll: (data) => ipcRenderer.invoke('biometric:enroll', data),
    delete: (data) => ipcRenderer.invoke('biometric:delete', data),
    onEvent: (callback) => {
      const wrappedCallback = (event, data) => callback(data);
      ipcRenderer.on('biometric-event', wrappedCallback);
      
      // Return cleanup function
      return () => ipcRenderer.removeListener('biometric-event', wrappedCallback);
    }
  },

  // Scheduler
  scheduler: {
    status: () => ipcRenderer.invoke('scheduler:status'),
    backup: () => ipcRenderer.invoke('scheduler:backup')
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings)
  },

  // File operations
  file: {
    openPath: (path) => ipcRenderer.invoke('file:open-path', path),
    showInFolder: (path) => ipcRenderer.invoke('file:show-in-folder', path)
  },

  // Menu events
  menu: {
    onAction: (callback) => {
      const wrappedCallback = (event, action) => callback(action);
      ipcRenderer.on('menu-action', wrappedCallback);
      
      // Return cleanup function
      return () => ipcRenderer.removeListener('menu-action', wrappedCallback);
    }
  },

  // System info
  system: {
    platform: process.platform,
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux'
  }
});

// Legacy API for backward compatibility (if needed)
contextBridge.exposeInMainWorld('electronAPI', {
  addBook: (book) => ipcRenderer.invoke('add-book', book),
  getBooks: () => ipcRenderer.invoke('get-books')
});
