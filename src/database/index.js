// ******************************************************
// DATABASE — single entry point for all drivers
// ******************************************************

// Import the config and the mongo connection
const config = require('../config');
const mongo = require('./mongo.connection');

// Define the drivers
const drivers = {
  mongo,
};

// Connect to the database
async function connect() {
  // Get the driver based on the database driver
  const driver = drivers[config.dbDriver];

  if (!driver) {
    throw new Error(`Unsupported DB_DRIVER: "${config.dbDriver}"`);
  }

  // Connect to the database
  await driver.connect();
}

// Disconnect from the database
async function disconnect() {
  // Get the driver based on the database driver
  const driver = drivers[config.dbDriver];

  if (!driver) {
    return;
  }

  // Disconnect from the database
  await driver.disconnect();
}

module.exports = { connect, disconnect };
