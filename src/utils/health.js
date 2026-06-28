// ******************************************************
// HEALTH — readiness checks for load balancers / orchestrators
// ******************************************************

const mongoose = require('mongoose');
const config = require('../config');

/**
 * Verify the active database is reachable.
 * Mongo: connection must be open and respond to ping.
 */
async function checkDatabaseHealth() {
  if (config.dbDriver !== 'mongo') {
    return { ok: false, database: 'unsupported' };
  }

  if (mongoose.connection.readyState !== 1) {
    return { ok: false, database: 'disconnected' };
  }

  await mongoose.connection.db.admin().ping();

  return { ok: true, database: 'connected' };
}

module.exports = {
  checkDatabaseHealth,
};
