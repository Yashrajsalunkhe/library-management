const http = require('http');
const axios = require('axios');
require('dotenv').config();

class BiometricBridge {
  constructor() {
    this.helperUrl = process.env.BIOMETRIC_HELPER_URL || 'http://localhost:5005';
    this.helperToken = process.env.BIOMETRIC_HELPER_TOKEN || 'default-token';
    this.server = null;
    this.eventCallbacks = [];
  }

  // Start HTTP server to receive events from biometric helper
  startEventServer(port = 5006) {
    if (this.server) {
      console.log('Biometric event server already running');
      return;
    }

    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/biometric-event') {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            
            // Verify token if provided
            const token = req.headers['authorization']?.replace('Bearer ', '');
            if (this.helperToken && token !== this.helperToken) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }

            // Process biometric event
            this.handleBiometricEvent(data);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('Error parsing biometric event:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(port, 'localhost', () => {
      console.log(`Biometric event server listening on http://localhost:${port}`);
    });
  }

  // Stop event server
  stopEventServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('Biometric event server stopped');
    }
  }

  // Handle biometric events from the helper
  handleBiometricEvent(data) {
    console.log('Received biometric event:', data);
    
    // Notify all registered callbacks
    this.eventCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in biometric event callback:', error);
      }
    });
  }

  // Register callback for biometric events
  onBiometricEvent(callback) {
    this.eventCallbacks.push(callback);
  }

  // Remove callback
  offBiometricEvent(callback) {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  // Check if biometric helper is running
  async checkHelperStatus() {
    try {
      const response = await axios.get(`${this.helperUrl}/status`, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${this.helperToken}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.code === 'ECONNREFUSED' ? 'Helper not running' : error.message 
      };
    }
  }

  // Start biometric scanning
  async startScanning() {
    try {
      const response = await axios.post(`${this.helperUrl}/start-scan`, {}, {
        headers: {
          'Authorization': `Bearer ${this.helperToken}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Stop biometric scanning
  async stopScanning() {
    try {
      const response = await axios.post(`${this.helperUrl}/stop-scan`, {}, {
        headers: {
          'Authorization': `Bearer ${this.helperToken}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Enroll new fingerprint
  async enrollFingerprint(memberId) {
    try {
      const response = await axios.post(`${this.helperUrl}/enroll`, {
        memberId: memberId
      }, {
        headers: {
          'Authorization': `Bearer ${this.helperToken}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete fingerprint template
  async deleteFingerprint(memberId) {
    try {
      const response = await axios.delete(`${this.helperUrl}/fingerprint/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${this.helperToken}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get device information
  async getDeviceInfo() {
    try {
      const response = await axios.get(`${this.helperUrl}/device-info`, {
        headers: {
          'Authorization': `Bearer ${this.helperToken}`
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Test connection to helper
  async testConnection() {
    const status = await this.checkHelperStatus();
    if (!status.success) {
      return {
        success: false,
        message: 'Cannot connect to biometric helper. Please ensure the helper application is running.',
        details: status.error
      };
    }

    try {
      const deviceInfo = await this.getDeviceInfo();
      return {
        success: true,
        message: 'Successfully connected to biometric helper',
        helperStatus: status.data,
        deviceInfo: deviceInfo.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Connected to helper but device may not be ready',
        error: error.message
      };
    }
  }
}

module.exports = BiometricBridge;
