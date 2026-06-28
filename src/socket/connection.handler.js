// ******************************************************
// SOCKET CONNECTION — per-client setup after auth
// ******************************************************

function userRoom(userId) {
  return `user:${userId}`;
}

function registerConnectionHandlers(io, socket) {
  const { id: userId } = socket.user;

  socket.join(userRoom(userId));

  socket.emit('connected', { userId });

  socket.on('disconnect', () => {
    socket.leave(userRoom(userId));
  });
}

module.exports = {
  userRoom,
  registerConnectionHandlers,
};
