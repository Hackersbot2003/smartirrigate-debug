require('dotenv').config();
const { initFirebase, getDb } = require('./config/firebase');
const { getLiveSensorData, getHistoryByHours, getLatestAnalysis, watchSensorData } = require('./services/firebaseService');

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
  
  console.log('\n4. Watching for sensor data changes...');
  console.log('Setting up real-time listener for /SensorData changes...');
  
  // Set up a listener for real-time updates
  watchSensorData((data) => {
    console.log('\n🔔 Firebase /SensorData CHANGED! - New data received:');
    console.log('Raw change payload:', data);
    
    if (data) {
      console.log('Parsed sensor data:');
      console.log('  Temperature:', data.temperature, '°C');
      console.log('  Humidity:', data.humidity, '%');
      console.log('  Soil Moisture:', data.soilMoisture, '%');
      
      // Log timestamp
      console.log('  Updated at:', new Date().toISOString());
    } else {
      console.log('  Data is null/empty');
    }
    console.log('---');
  });
  
  console.log('\n5. Direct Firebase database access test...');
  try {
    const db = getDb();
    console.log('Database reference created successfully');
    
    // Test reading raw data from Firebase
    const sensorSnapshot = await db.ref('SensorData').once('value');
    const sensorRawData = sensorSnapshot.val();
    console.log('Raw SensorData from Firebase:', sensorRawData);
    
    const historySnapshot = await db.ref('SensorHistory').once('value');
    const historyKeys = historySnapshot.val() ? Object.keys(historySnapshot.val()) : [];
    console.log('Number of history entries in Firebase:', historyKeys.length);
    
    const analysisSnapshot = await db.ref('LatestAnalysis').once('value');
    const analysisData = analysisSnapshot.val();
    console.log('LatestAnalysis from Firebase:', analysisData);
    
  } catch (error) {
    console.error('Error with direct database access:', error.message);
  }
  
  console.log('\n=== Firebase Data Connection Test Complete ===');
  console.log('Firebase is listening for real-time updates. Check console for incoming data...');
}

testFirebaseConnection();