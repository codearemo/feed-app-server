// ******************************************************
// CHAT REPOSITORIES — driver switch (mongo today, SQL later)
// ******************************************************

const config = require('../../../config');

const repositories = {
  mongo: {
    conversations: require('./conversations.repository.mongo'),
    messages: require('./messages.repository.mongo'),
    readState: require('./conversation-read-state.repository.mongo'),
  },
};

const chatRepositories = repositories[config.dbDriver];

if (!chatRepositories) {
  throw new Error(`No chat repositories for DB_DRIVER: "${config.dbDriver}"`);
}

module.exports = chatRepositories;
