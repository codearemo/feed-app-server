// ******************************************************
// MONGODB CONNECTION VIA MONGOOSE
// ******************************************************

const mongoose = require('mongoose');
const config = require('../config');

// Connect to the database
async function connect() {
  // Connect to the database using the mongoose connect method
  try {
    await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

// Disconnect from the database
async function disconnect() {
  // Disconnect from the database using the mongoose disconnect method
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

// Export the connect and disconnect functions
module.exports = { connect, disconnect };
