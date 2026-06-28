// ******************************************************
// FILES REPOSITORY — driver switch (mongo today, SQL later)
// ******************************************************

const config = require('../../../config');

const repositories = {
  mongo: require('./files.repository.mongo'),
};

const filesRepository = repositories[config.dbDriver];

if (!filesRepository) {
  throw new Error(`No files repository for DB_DRIVER: "${config.dbDriver}"`);
}

module.exports = filesRepository;
