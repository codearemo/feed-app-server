// ******************************************************
// SOCKET REFERENCE — shared docs for Swagger & Postman
// ******************************************************
//
// Socket.IO is not part of OpenAPI paths; this module supplies descriptive
// documentation for Swagger UI and Postman collections.

const { SOCKET_EVENTS } = require('../constants/socket-events');
const config = require('../config');

const CLIENT_AGENT_PATH = 'docs/client-agent.md';

function getSocketConnectionSummary() {
  return [
    '## Real-time (Socket.IO)',
    '',
    'Socket.IO runs on the **same origin** as the REST API (not under `/api/v1`).',
    '',
    '| Setting | Value |',
    '|---------|-------|',
    `| URL | \`http://localhost:${config.port}\` (local) or production API origin |`,
    `| Path | \`${config.socket.path}\` (default \`/socket.io\`) |`,
    '| Auth | Access JWT in handshake: `auth: { token: "<access-jwt>" }` |',
    '| CORS | Same \`ALLOWED_ORIGINS\` as REST |',
    '',
    '**Not testable in Swagger UI** — use Postman Socket.IO requests, the client, or see',
    `[${CLIENT_AGENT_PATH}](${CLIENT_AGENT_PATH}) for full TypeScript examples.`,
    '',
    '### Connect (client)',
    '',
    '```javascript',
    "import { io } from 'socket.io-client';",
    '',
    "const socket = io('http://localhost:3000', {",
    "  path: '/socket.io',",
    '  auth: { token: accessJwt },',
    '});',
    '',
    "socket.on('connected', ({ userId }) => { /* ready */ });",
    '```',
    '',
    'On connect the server joins you to `user:<userId>` and emits `connected`.',
    'Refresh the access token and reconnect when the JWT expires (default `15m`).',
    '',
    '### Client → server (emit)',
    '',
    '| Event | Payload | Ack |',
    '|-------|---------|-----|',
    '| `feed:join` | — | `{ ok: true }` |',
    '| `feed:leave` | — | `{ ok: true }` |',
    '| `post:join` | `{ postId }` | `{ ok: true }` or error |',
    '| `post:leave` | `{ postId }` | `{ ok: true }` |',
    '| `presence:heartbeat` | — | `{ ok: true, userId }` (~every 30s) |',
    '| `conversation:join` | `{ conversationId }` | `{ ok: true }` |',
    '| `conversation:leave` | `{ conversationId }` | `{ ok: true }` |',
    '| `message:typing` | `{ conversationId }` | `{ ok: true }` |',
    '| `message:stop_typing` | `{ conversationId }` | `{ ok: true }` |',
    '| `message:delivered` | `{ conversationId, messageId }` | `{ ok: true, data? }` |',
    '',
    '### Server → client (listen) — feed room',
    '',
    'Join with `feed:join` first.',
    '',
    '| Event | Payload |',
    '|-------|---------|',
    `| \`${SOCKET_EVENTS.FEED_POST_CREATED}\` | Full feed post |`,
    `| \`${SOCKET_EVENTS.FEED_POST_UPDATED}\` | Full feed post |`,
    `| \`${SOCKET_EVENTS.FEED_POST_DELETED}\` | \`{ id }\` |`,
    '',
    '### Server → client — post room',
    '',
    'Join with `post:join` + `{ postId }`.',
    '',
    '| Event | Payload |',
    '|-------|---------|',
    `| \`${SOCKET_EVENTS.COMMENT_CREATED}\` | Full comment |`,
    `| \`${SOCKET_EVENTS.POST_LIKED}\` | \`{ postId, likeCount, likedBy }\` |`,
    `| \`${SOCKET_EVENTS.COMMENT_LIKED}\` | \`{ postId, commentId, likeCount, likedBy }\` |`,
    '| … | See client-agent.md |',
    '',
    '### Server → client — user room (notifications)',
    '',
    'Auto-joined on connect. Skips your own actions.',
    '',
    '| Event | Payload |',
    '|-------|---------|',
    `| \`${SOCKET_EVENTS.POST_COMMENTED}\` | \`{ postId, comment }\` |`,
    `| \`${SOCKET_EVENTS.MESSAGE_RECEIVED}\` | \`{ conversationId, message }\` |`,
    `| \`${SOCKET_EVENTS.MESSAGE_SENT}\` | Full chat message |`,
    `| \`${SOCKET_EVENTS.MESSAGE_DELIVERED}\` | \`{ conversationId, messageId, deliveredAt, message }\` |`,
    `| \`${SOCKET_EVENTS.CONVERSATION_READ}\` | \`{ conversationId, userId, readAt }\` |`,
    '',
    '### Server → client — presence (global)',
    '',
    `| \`${SOCKET_EVENTS.PRESENCE_ONLINE}\` | \`{ userId }\` |`,
    `| \`${SOCKET_EVENTS.PRESENCE_OFFLINE}\` | \`{ userId }\` |`,
    '',
    '### Postman',
    '',
    'Import `postman/socket-io.postman_collection.json` alongside the REST collection.',
    'Login via REST first, copy `token` into the environment, then open the Socket.IO request.',
  ].join('\n');
}

function getSwaggerSocketDescription() {
  return [
    'Social feed and direct-messaging **REST API**.',
    '',
    'For client integration (types, flows, error handling), see',
    `[${CLIENT_AGENT_PATH}](${CLIENT_AGENT_PATH}).`,
    '',
    getSocketConnectionSummary(),
  ].join('\n');
}

function getPostmanSocketFolderDescription() {
  return [
    '# Real-time (Socket.IO)',
    '',
    'REST endpoints below do **not** cover WebSockets. Socket.IO uses the same host as `{{baseUrl}}`,',
    `path \`${config.socket.path}\`, and the access JWT from login (\`{{token}}\`).`,
    '',
    '## Quick test in Postman',
    '',
    '1. Run **Auth → Login** and ensure `{{token}}` is set.',
    '2. Import **`postman/socket-io.postman_collection.json`** (separate collection).',
    '3. Open **Connect + feed:join** → Socket.IO tab → Connect.',
    '4. Listen for `connected`, then emit `feed:join` (ack callback).',
    '5. Create a post via REST — listen for `feed:post_created`.',
    '',
    'Handshake auth (not Bearer header): `{ "token": "{{token}}" }` in Socket.IO Auth.',
    '',
    'Full event list: `docs/client-agent.md` or Swagger `/api-docs` intro.',
  ].join('\n');
}

function getPostmanSocketFolder() {
  return {
    name: 'Real-time (Socket.IO)',
    description: {
      content: getPostmanSocketFolderDescription(),
      type: 'text/markdown',
    },
    item: [
      {
        name: 'Docs — import socket-io.postman_collection.json',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{baseUrl}}/health',
            host: ['{{baseUrl}}'],
            path: ['health'],
          },
          description: {
            content: getPostmanSocketFolderDescription(),
            type: 'text/markdown',
          },
        },
        response: [],
      },
    ],
  };
}

function getPostmanSocketIoCollection() {
  return {
    info: {
      name: 'Feed App — Socket.IO',
      description: getPostmanSocketFolderDescription(),
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: 'Connect + feed:join',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{baseUrl}}',
            host: ['{{baseUrl}}'],
          },
          description: {
            content: [
              '## Socket.IO request',
              '',
              'In Postman, change the request type to **Socket.IO** (if the imported method',
              'does not switch automatically).',
              '',
              '### Connection',
              '',
              `- **URL:** \`{{baseUrl}}\``,
              `- **Path:** \`${config.socket.path}\``,
              '- **Auth → Handshake:** `{ "token": "{{token}}" }`',
              '',
              '### After connect',
              '',
              '1. **Listen** for event `connected` → `{ userId }`',
              '2. **Emit** `feed:join` (no payload) — wait for ack `{ ok: true }`',
              '3. **Listen** for `feed:post_created` while creating a post via REST',
              '',
              '### Token expiry',
              '',
              'Access JWT expires (default 15m). On `connect_error`, refresh via',
              '`POST {{baseUrl}}/api/v1/auth/refresh`, update `{{token}}`, reconnect.',
            ].join('\n'),
            type: 'text/markdown',
          },
        },
        protocolProfileBehavior: {
          socketio: {
            version: '4',
            listen: [
              { event: 'connected' },
              { event: SOCKET_EVENTS.FEED_POST_CREATED },
            ],
            emit: [{ event: SOCKET_EVENTS.FEED_JOIN, payload: '' }],
          },
        },
        response: [],
      },
      {
        name: 'post:join (listen for comments)',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{baseUrl}}',
            host: ['{{baseUrl}}'],
          },
          description: {
            content: [
              'Emit `post:join` with payload `{ "postId": "<mongo-id>" }`.',
              'Listen for `comment:created`, `post:liked`, etc.',
            ].join('\n'),
            type: 'text/markdown',
          },
        },
        protocolProfileBehavior: {
          socketio: {
            version: '4',
            listen: [
              { event: SOCKET_EVENTS.COMMENT_CREATED },
              { event: SOCKET_EVENTS.POST_LIKED },
            ],
            emit: [
              {
                event: SOCKET_EVENTS.POST_JOIN,
                payload: '{ "postId": "{{postId}}" }',
              },
            ],
          },
        },
        response: [],
      },
    ],
    variable: [
      {
        key: 'baseUrl',
        value: `http://localhost:${Number(process.env.PORT) || 3000}`,
      },
      { key: 'token', value: '' },
      { key: 'postId', value: '' },
    ],
  };
}

module.exports = {
  getSwaggerSocketDescription,
  getPostmanSocketFolder,
  getPostmanSocketIoCollection,
};
