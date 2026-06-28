// ******************************************************
// AUTH REPOSITORIES — driver switch (mongo today, SQL later)
// ******************************************************

const config = require('../../../config');

const refreshTokensRepositories = {
  mongo: require('./refresh-tokens.repository.mongo'),
};

const emailOtpsRepositories = {
  mongo: require('./email-otps.repository.mongo'),
};

const twoFactorChallengesRepositories = {
  mongo: require('./two-factor-challenges.repository.mongo'),
};

const twoFactorSetupsRepositories = {
  mongo: require('./two-factor-setups.repository.mongo'),
};

const refreshTokensRepository = refreshTokensRepositories[config.dbDriver];
const emailOtpsRepository = emailOtpsRepositories[config.dbDriver];
const twoFactorChallengesRepository =
  twoFactorChallengesRepositories[config.dbDriver];
const twoFactorSetupsRepository = twoFactorSetupsRepositories[config.dbDriver];

if (!refreshTokensRepository) {
  throw new Error(
    `No refresh tokens repository for DB_DRIVER: "${config.dbDriver}"`,
  );
}

if (!emailOtpsRepository) {
  throw new Error(
    `No email OTPs repository for DB_DRIVER: "${config.dbDriver}"`,
  );
}

if (!twoFactorChallengesRepository) {
  throw new Error(
    `No two-factor challenges repository for DB_DRIVER: "${config.dbDriver}"`,
  );
}

if (!twoFactorSetupsRepository) {
  throw new Error(
    `No two-factor setups repository for DB_DRIVER: "${config.dbDriver}"`,
  );
}

module.exports = {
  refreshTokens: refreshTokensRepository,
  emailOtps: emailOtpsRepository,
  twoFactorChallenges: twoFactorChallengesRepository,
  twoFactorSetups: twoFactorSetupsRepository,
};
