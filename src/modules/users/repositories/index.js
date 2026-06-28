// ******************************************************
// USERS REPOSITORY — driver switch (mongo today, SQL later)
// Help me get the current database I'm working with
// It serves as an interface for the database driver (switch)
// ******************************************************

const config = require('../../../config');

// Define the repositories
const repositories = {
  mongo: require('./users.repository.mongo'),
};

// Get the users repository based on the database driver
const usersRepository = repositories[config.dbDriver];

if (!usersRepository) {
  throw new Error(`No users repository for DB_DRIVER: "${config.dbDriver}"`);
}

module.exports = usersRepository;
