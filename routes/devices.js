const express = require('express');
const router = express.Router();
const { loadDevices, saveDevices, controlDevice } = require('../app');

router.get('/', (req, res) => {
  const devices = loadDevices();
  res.render('index', { devices });
});

router.post('/control', async (req, res) => {
  const { deviceId, action } = req.body;
  const devices = loadDevices();
  const device = devices.find(d => d.id === deviceId);
  
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  try {
    const result = await controlDevice(device, action);
    device.status = result.status;
    saveDevices(devices);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;