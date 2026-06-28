// ******************************************************
// POSTS REPOSITORY — driver switch (mongo today, SQL later)
// ******************************************************

const config = require('../../../config');

const repositories = {
  mongo: require('./posts.repository.mongo'),
};

const postsRepository = repositories[config.dbDriver];

if (!postsRepository) {
  throw new Error(`No posts repository for DB_DRIVER: "${config.dbDriver}"`);
}

module.exports = postsRepository;
