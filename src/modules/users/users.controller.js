const usersService = require('./users.service');
const { sendSuccess } = require('../../utils/api-response');

async function getLoggedInUserProfile(req, res, next) {
  try {
    const user = await usersService.getLoggedInUserProfile(req.user.id);
    sendSuccess(res, {
      message: 'Profile fetched successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function updateLoggedInUserProfile(req, res, next) {
  try {
    const user = await usersService.updateLoggedInUserProfile(
      req.user.id,
      req.body,
    );
    sendSuccess(res, {
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLoggedInUserProfile,
  updateLoggedInUserProfile,
};
