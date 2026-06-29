// ******************************************************
// SOCKET LOGGER — dev-friendly event tracing
// ******************************************************

const config = require('../config');

function shouldLogSockets() {
  return config.socket.log;
}

function summarizePayload(payload) {
  if (payload === undefined || payload === null) {
    return undefined;
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  const summary = {};

  if (payload.id !== undefined) {
    summary.id = payload.id;
  }

  if (payload.postId !== undefined) {
    summary.postId = payload.postId;
  }

  if (payload.commentId !== undefined) {
    summary.commentId = payload.commentId;
  }

  if (payload.userId !== undefined) {
    summary.userId = payload.userId;
  }

  if (payload.title !== undefined) {
    summary.title = payload.title;
  }

  if (payload.likeCount !== undefined) {
    summary.likeCount = payload.likeCount;
  }

  if (payload.author?.id !== undefined) {
    summary.authorId = payload.author.id;
  }

  if (payload.likedBy?.id !== undefined) {
    summary.likedBy = payload.likedBy.id;
  }

  if (payload.content !== undefined) {
    summary.content =
      typeof payload.content === 'string'
        ? payload.content.slice(0, 80)
        : payload.content;
  }

  if (payload.conversationId !== undefined) {
    summary.conversationId = payload.conversationId;
  }

  if (Object.keys(summary).length > 0) {
    return summary;
  }

  return payload;
}

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  return ` ${JSON.stringify(meta)}`;
}

function logSocketConnect({ userId, socketId }) {
  if (!shouldLogSockets()) {
    return;
  }

  console.log(
    `[socket] connect userId=${userId} socketId=${socketId}`,
  );
}

function logSocketDisconnect({ userId, socketId }) {
  if (!shouldLogSockets()) {
    return;
  }

  console.log(
    `[socket] disconnect userId=${userId} socketId=${socketId}`,
  );
}

function logSocketIn({ userId, event, payload, result }) {
  if (!shouldLogSockets()) {
    return;
  }

  const summary = summarizePayload(payload);
  const suffix = summary !== undefined ? formatMeta(summary) : '';
  const resultSuffix =
    result !== undefined ? ` → ack ${JSON.stringify(result)}` : '';

  console.log(
    `[socket] in  user=${userId} event=${event}${suffix}${resultSuffix}`,
  );
}

function logSocketOut({ room, event, payload }) {
  if (!shouldLogSockets()) {
    return;
  }

  const summary = summarizePayload(payload);
  const suffix = summary !== undefined ? formatMeta(summary) : '';

  console.log(`[socket] out room=${room} event=${event}${suffix}`);
}

module.exports = {
  shouldLogSockets,
  logSocketConnect,
  logSocketDisconnect,
  logSocketIn,
  logSocketOut,
};
