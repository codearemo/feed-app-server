// ******************************************************
// SOCKET AUTH — JWT handshake (same rules as HTTP authenticate)
// ******************************************************
//
// Clients pass the access JWT via handshake:
//   io(url, { auth: { token: '<access-jwt>' } })
//
// Also accepts Authorization: Bearer <token> on the handshake headers.

const { verifyToken } = require('../modules/auth/access-jwt');
const usersRepository = require('../modules/users/repositories');
const {
  assertUserIsActive,
  assertEmailVerified,
} = require('../modules/auth/auth.utils');

function extractTokenFromHandshake(handshake) {
  const authToken = handshake.auth?.token;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const authorization = handshake.headers?.authorization;

  if (
    typeof authorization === 'string' &&
    authorization.startsWith('Bearer ')
  ) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

async function authenticateSocket(socket, next) {
  const token = extractTokenFromHandshake(socket.handshake);

  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await usersRepository.findById(payload.sub);

    if (!user) {
      next(new Error('Invalid or expired token'));
      return;
    }

    assertUserIsActive(user);
    assertEmailVerified(user);

    socket.user = { id: payload.sub };
    next();
  } catch (error) {
    if (error.statusCode === 403) {
      next(error);
      return;
    }

    next(new Error('Invalid or expired token'));
  }
}

module.exports = {
  authenticateSocket,
  extractTokenFromHandshake,
};
