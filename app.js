const fs = require('fs');
const path = require('path');
const TPLink = require('tplink-lightbulb');

const devicesPath = path.join(__dirname, 'devices.json');

// Function to load devices from JSON
function loadDevices() {
  try {
    return JSON.parse(fs.readFileSync(devicesPath, 'utf8'));
  } catch (error) {
    console.error('Error reading devices:', error);
    return [];
  }
}

// Function to save devices to JSON
function saveDevices(devices) {
  fs.writeFileSync(devicesPath, JSON.stringify(devices, null, 2));
}

// Function to interact with a device
function controlDevice(device, action) {
  const bulb = new TPLink.Bulb(device.ip);
  return new Promise((resolve, reject) => {
    if (action === 'on') {
      bulb.power(true).then(() => resolve({ status: 'on' })).catch(reject);
    } else if (action === 'off') {
      bulb.power(false).then(() => resolve({ status: 'off' })).catch(reject);
    } else {
      reject(new Error('Invalid action'));
    }
  });
}

module.exports = { loadDevices, saveDevices, controlDevice };