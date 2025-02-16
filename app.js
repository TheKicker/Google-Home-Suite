const express = require('express');
const path = require('path');
const fs = require('fs');
const { Client } = require('tplink-smarthome-api');
const bodyParser = require('body-parser');
const moment = require('moment');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 1234;
const devicesPath = path.join(__dirname, 'devices.json');

// Setup middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Function to load devices from JSON
function loadDevices() {
  try {
    return JSON.parse(fs.readFileSync(devicesPath, 'utf8'));
  } catch (error) {
    console.error('Error reading devices:', error);
    return [];
  }
}

// Function to save devices to JSON (Step 3)
function saveDevices(devices) {
  try {
    fs.writeFileSync(devicesPath, JSON.stringify(devices, null, 2));
    console.log('devices.json updated successfully');
  } catch (error) {
    console.error('Error saving devices:', error);
  }
}

// Function to interact with a device (Steps 2 and 4 integrated)
async function controlDevice(device, action) {
  const client = new Client();
  let deviceInstance;
  
  try {
    deviceInstance = await client.getDevice({ host: device.ip }); // Get the device by IP

    if (action === 'on' || action === 'off') {
      console.log(`Attempting to set ${device.name} (${device.type}) to ${action}`);
      await deviceInstance.setPowerState(action === 'on');
      
      // Introduce a delay to ensure the state change is stable
      await new Promise(resolve => setTimeout(resolve, 500)); // Adjust this delay as needed

      // Check the state again to confirm
      const status = await deviceInstance.getSysInfo();
      device.status = status.relay_state ? 'on' : 'off';
      console.log(`After setting state, ${device.name} status is: ${device.status}`);

      const devices = loadDevices();
      const index = devices.findIndex(d => d.id === device.id);
      if (index !== -1) {
        devices[index] = device;
        saveDevices(devices);
        console.log(`Confirmed status for ${device.name} is: ${device.status} in devices.json`);
      }
      return { status: device.status };
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error(`Error controlling ${device.type} device ${device.name}:`, error);
    throw error;
  } finally {
    if (deviceInstance && deviceInstance.close) await deviceInstance.close();
  }
}

// Logging function with directory and file creation
function logAction(actionDetails, req) {
  const date = moment().format('MM-DD-YYYY');
  const logDir = path.join(__dirname, 'logs');
  const logFile = path.join(logDir, `${date}.txt`);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let clientIp = 'Unknown';
  let userAgent = 'Unknown';

  if (req) {
    clientIp = req.headers['x-forwarded-for'] || 
               req.socket.remoteAddress.replace(/^::ffff:/, '');
    userAgent = req.headers['user-agent'] || 'Unknown';

    // Extract only the content inside the first parentheses
    const match = userAgent.match(/\(([^)]+)\)/);
    userAgent = match ? `(${match[1]})` : 'Unknown';
  }

  const logEntry = `${moment().format('HH:mm:ss')} - ${JSON.stringify(actionDetails)} by ${clientIp} - User-Agent: ${userAgent}\n`;
  
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error('Error appending to log file:', err);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/devices', (req, res) => {
  const devices = loadDevices();
  res.json(devices);
});

app.get('/status/:deviceId', async (req, res) => {
  const devices = loadDevices();
  const device = devices.find(d => d.id === req.params.deviceId);
  
  if (!device) {
    console.log(`Device with ID ${req.params.deviceId} not found`);
    return res.status(404).json({ error: 'Device not found' });
  }

  const client = new Client();
  try {
    const deviceInstance = await client.getDevice({ host: device.ip });
    const status = await deviceInstance.getSysInfo();
    console.log(`Real-time status for ${device.name}:`, status.relay_state ? 'on' : 'off');
    
    // Update the JSON with the new status (optional, for consistency)
    device.status = status.relay_state ? 'on' : 'off';
    saveDevices(devices);
    
    res.json({ status: device.status });
  } catch (error) {
    console.error(`Error fetching real-time status for ${device.name}:`, error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

app.post('/control', async (req, res) => {
  const { deviceId, action } = req.body;
  const devices = loadDevices();
  const device = devices.find(d => d.id === deviceId);
  
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  try {
    const result = await controlDevice(device, action);
    logAction({ deviceId, action, result }, req); // Pass req here
    res.json(result);
  } catch (error) {
    logAction({ deviceId, action, error: error.message }, req); // Pass req here
    res.status(500).json({ error: error.message });
  }
});

// Function to get network interfaces
function getNetworkInterfaces() {
  const nics = os.networkInterfaces();
  const interfaces = [];
  for (const name of Object.keys(nics)) {
    for (const net of nics[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        interfaces.push(`${net.address}:${PORT}`);
      }
    }
  }
  return interfaces;
}

// Start server and log local host and network IP
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Localhost: http://localhost:${PORT}`);
  
  const networkInterfaces = getNetworkInterfaces();
  if (networkInterfaces.length > 0) {
    // console.log('Network IP(s):');
    networkInterfaces.forEach(ip => console.log(`Network: http://${ip}`));
  } else {
    console.log('No network IP found.');
  }
  // console.log('Devices loaded:', loadDevices().map(d => d.name)); // Log devices at startup
});

module.exports = app; // For testing or further modular use