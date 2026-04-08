require('dotenv').config();
const { initFirebase } = require('./config/firebase');
const { getLiveSensorData, getHistoryByHours, getLatestAnalysis } = require('./services/firebaseService');

async function testFirebaseConnection() {
  console.log('Initializing Firebase...');
  initFirebase();
  
  console.log('\n=== Testing Firebase Data Connection ===');
  
  console.log('\n1. Getting live sensor data...');
  try {
    const liveData = await getLiveSensorData();
    console.log('Live sensor data:', liveData);
  } catch (error) {
    console.error('Error getting live sensor data:', error.message);
  }
  
  console.log('\n2. Getting sensor history (last 24 hours)...');
  try {
    const history = await getHistoryByHours(24);
    console.log('Sensor history count:', history.length);
    if (history.length > 0) {
      console.log('Recent history entries:');
      history.slice(-5).forEach((entry, index) => {
        console.log(`${index + 1}:`, {
          timestamp: new Date(entry.timestamp).toISOString(),
          temperature: entry.temperature,
          humidity: entry.humidity,
          soilMoisture: entry.soilMoisture
        });
      });
    }
  } catch (error) {
    console.error('Error getting sensor history:', error.message);
  }
  
  console.log('\n3. Getting latest analysis...');
  try {
    const analysis = await getLatestAnalysis();
    console.log('Latest analysis:', analysis);
  } catch (error) {
    console.error('Error getting latest analysis:', error.message);
  }
  
  console.log('\n=== Firebase Data Connection Test Complete ===');
}

testFirebaseConnection();