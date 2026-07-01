# Feed App Server

Backend API for a social feed with posts, comments, likes, and 1-on-1 chat. Built on **Express 5**, **MongoDB**, and **Socket.IO**, with JWT auth, file uploads, and real-time updates.

**Base URL:** `http://localhost:3000/api/v1`  
**Interactive docs:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)  
**Client integration guide:** [docs/client-agent.md](docs/client-agent.md)

---

## What it does

Feed App Server powers a client where users can:

- Browse a **paginated feed** of posts with images, tags, likes, and comment counts
- **Create, edit, and delete** their own posts and top-level comments
- **Like** posts and comments
- View **public user profiles** and message other users
- Chat in **1-on-1 conversations** with typing indicators, delivery ticks, and read receipts
- Receive **live updates** over WebSockets (new posts, comments, likes, messages, presence)

All protected routes use Bearer JWT. Responses follow a uniform `{ data, message, pagination? }` envelope.

---

## Features

### Social feed

| Capability | Details |
|------------|---------|
| Feed | `GET /feed` — paginated top-level posts, newest first |
| Posts | Full CRUD with title, excerpt, content, tags, and image attachments |
| Comments | Flat comments on posts (one level; no reply threads yet) |
| Likes | Like/unlike posts and comments; `likeCount` + `likedByMe` on responses |
| Authors | `author` includes `name`, `avatar`, and `profilePicture` |
| Permissions | Only the author can `PATCH` or `DELETE` their post/comment |

### Direct messages

| Capability | Details |
|------------|---------|
| Inbox | `GET /conversations` with `unreadCount`, `lastMessage`, `participantLastReadAt` |
| Thread | `GET/POST /conversations/:id/messages` |
| Read state | `POST /conversations/:id/read` |
| Check marks | Sent (`message:sent`), delivered (`message:delivered`), read (`conversation:read` + `readByRecipient`) |

### Real-time (Socket.IO)

| Area | Events |
|------|--------|
| Feed | `feed:join`, `feed:post_created`, `feed:post_updated`, `feed:post_deleted` |
| Post detail | `post:join`, `comment:created`, `post:liked`, `comment:liked`, … |
| Chat | `conversation:join`, `message:created`, `message:sent`, `message:delivered`, `conversation:read` |
| Presence | `presence:online`, `presence:offline`, `presence:heartbeat` |

Connect with the access JWT: `io(origin, { auth: { token } })`. See [docs/client-agent.md](docs/client-agent.md) for full socket contracts.

### Platform

- **Auth** — register, email OTP verification, login, Google/Apple social login, refresh tokens, forgot/reset password
- **2FA** — TOTP authenticator apps
- **Users** — `GET/PATCH /users/me`, public `GET /users/:userId`
- **Uploads** — `local`, S3, or Cloudinary; images embedded as full file objects on posts
- **Security** — Helmet, CORS, rate limits, bcrypt passwords, Zod validation
- **Testing** — 139+ Vitest integration tests with in-memory MongoDB

---

## Quick start

### Prerequisites

- Node.js 20+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Install and run

```bash
git clone <repository-url>
cd feed-app-server
npm install
cp .env.example .env   # set JWT_SECRET, MONGO_URI, SMTP, etc.
npm run dev
```

Server: `http://localhost:3000`  
API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api-docs`

Point your client at **port 3000** for REST and sockets — not the Vite dev server (5173). Set `VITE_API_BASE_URL=http://localhost:3000/api/v1` or use a dev proxy.

### Smoke test

```bash
curl http://localhost:3000/health
npm test
```

---

## API overview

### Feed & posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/feed?page&limit` | Bearer | Paginated feed |
| `POST` | `/posts` | Bearer | Create post (201) |
| `GET` | `/posts/:postId` | Bearer | Post detail |
| `PATCH` | `/posts/:postId` | Bearer | Update own post |
| `DELETE` | `/posts/:postId` | Bearer | Soft-delete own post |
| `POST` / `DELETE` | `/posts/:postId/likes` | Bearer | Like / unlike post |
| `GET` | `/posts/:postId/comments?page&limit` | Bearer | List comments (oldest first) |
| `POST` | `/posts/:postId/comments` | Bearer | Create comment (201) |
| `GET` / `PATCH` / `DELETE` | `/posts/:postId/comments/:commentId` | Bearer | Comment CRUD (author for mutating) |
| `POST` / `DELETE` | `/posts/:postId/comments/:commentId/likes` | Bearer | Like / unlike comment |

Posts and comments share the same content shape (`title`, `excerpt`, `content`, `tags`, `images[]`). Feed posts include `commentCount`; comments include `likeCount` but not `commentCount`.

### Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/conversations?page&limit` | Bearer | Inbox |
| `POST` | `/conversations` | Bearer | Start or return existing DM (`{ participantId }`) |
| `GET` | `/conversations/:conversationId` | Bearer | Conversation summary |
| `POST` | `/conversations/:conversationId/read` | Bearer | Mark read (+ deliver pending messages) |
| `GET` | `/conversations/:conversationId/messages` | Bearer | Message history |
| `POST` | `/conversations/:conversationId/messages` | Bearer | Send message |
| `POST` | `/conversations/:conversationId/messages/:messageId/delivered` | Bearer | Recipient delivery ack |

### Users & uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` / `PATCH` | `/users/me` | Bearer | Own profile |
| `GET` | `/users/:userId` | Bearer | Public profile (no email) |
| `POST` | `/uploads` | Bearer | Multipart upload (`files` field) |
| `GET` | `/uploads/:fileId/download` | Bearer | Download when not public |
| `DELETE` | `/uploads/:fileId` | Bearer | Soft-delete own file |

### Auth & health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check (503 if DB down) |
| `POST` | `/auth/register` | No | Register + send verification OTP |
| `POST` | `/auth/verify-email` | No | Confirm email |
| `POST` | `/auth/login` | No | Login (or 2FA challenge) |
| `POST` | `/auth/social` | No | Google / Apple `idToken` |
| `POST` | `/auth/refresh` | No | Rotate token pair |
| `POST` | `/auth/logout` | No | Revoke refresh token |
| `POST` | `/auth/forgot-password` | No | Send reset OTP |
| `POST` | `/auth/reset-password` | No | Reset with OTP |
| `POST` | `/auth/2fa/setup` … `/2fa/disable` | Bearer / No | TOTP 2FA lifecycle |

For request/response examples, field-level validation, socket payloads, and TypeScript types for the client, see **[docs/client-agent.md](docs/client-agent.md)**.

---

## Project structure

```
feed-app-server/
├── docs/
│   └── client-agent.md         # Client integration reference (types, sockets, flows)
├── postman/                    # Generated Postman collection
├── src/
│   ├── api/v1/                 # Version router
│   ├── modules/
│   │   ├── auth/               # Register, login, 2FA, OTP, JWT
│   │   ├── users/              # Profiles, public user view
│   │   ├── files/              # Uploads (local / S3 / Cloudinary)
│   │   ├── posts/              # Feed, posts, comments, likes
│   │   └── chat/               # Conversations, messages, read state
│   ├── socket/                 # Socket.IO auth, rooms, handlers
│   ├── constants/              # Shared constants (e.g. socket event names)
│   ├── middleware/             # Auth, rate limit, errors
│   └── docs/                   # OpenAPI spec (Swagger)
├── tests/                      # Vitest integration tests
└── .env.example
```

### Request flow

```
HTTP Request → api/v1 → routes → controller → service → repository → MongoDB
Socket       → JWT handshake → handlers → service (same business layer)
```

### Layer rules

- **Controllers** — HTTP only; call services, send `sendSuccess` responses
- **Services** — business rules; no Express or Mongoose imports
- **Repositories** — data access
- **Models** — Mongoose schemas

---

## Environment variables

Copy `.env.example` to `.env`. Minimum for local dev:

```env
JWT_SECRET=your-long-random-secret
MONGO_URI=mongodb://localhost:27017/feed-app
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
SMTP_HOST=...   # required for email verification / password reset
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `3000`) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | No | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default `7d`) |
| `MONGO_URI` | Yes† | MongoDB connection string |
| `ALLOWED_ORIGINS` | No | CORS origins (comma-separated) |
| `SOCKET_ENABLED` | No | Enable Socket.IO (default `true`) |
| `SOCKET_LOG` | No | Log socket events (default `true` in development) |
| `UPLOAD_DRIVER` | No | `local`, `s3`, or `cloudinary` |
| `UPLOAD_PUBLIC_ACCESS` | No | Public file URLs in dev (default `true` in development) |
| `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` | No* | Social login |
| `SMTP_*` | Yes†† | Email for OTP flows |

† Required when `DB_DRIVER=mongo` (default)  
†† Required for verify-email and forgot-password in real environments

See `.env.example` for the full list (rate limits, S3, Cloudinary, etc.).

---

## Auth reference

### Register and verify

Password: min 8 chars, upper, lower, number, special character. Login is blocked until email is verified.

```http
POST /api/v1/auth/register
{ "firstName", "lastName", "username", "email", "password" }

POST /api/v1/auth/verify-email
{ "email", "otp" }
```

### Login

```http
POST /api/v1/auth/login
{ "identifier": "jane", "password": "Password123!" }
```

Returns `data.token` + `data.refreshToken`, or `data.requiresTwoFactor: true` with `twoFactorToken` when 2FA is enabled.

```http
Authorization: Bearer <accessToken>
```

### Social login

```http
POST /api/v1/auth/social
{ "provider": "google" | "apple", "idToken": "..." }
```

### Refresh and logout

```http
POST /api/v1/auth/refresh   { "refreshToken" }
POST /api/v1/auth/logout    { "refreshToken" }
```

Refresh tokens are opaque, stored hashed, and rotate on each refresh.

### Two-factor authentication

```http
POST /api/v1/auth/2fa/setup    Authorization: Bearer …
POST /api/v1/auth/2fa/confirm  { "code" }
POST /api/v1/auth/2fa/verify   { "twoFactorToken", "code" }   # after login challenge
POST /api/v1/auth/2fa/disable  { "code", "password?" }
```

### Profile

```http
GET  /api/v1/users/me
PATCH /api/v1/users/me   { "firstName", "lastName", "username", "bio", "profilePicture" }
```

Upload an image via `POST /uploads`, then set `profilePicture` to the returned `id`. `GET /users/me` returns the full `profilePicture` object.

---

## Response format

**Success:** `{ "data": …, "message": "…", "pagination"?: … }`  
**Error:** `{ "data": null, "message": "…", "details"?: [{ "field", "message" }] }`

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Validation / bad request |
| `401` | Missing or invalid JWT |
| `403` | Forbidden (inactive, unverified, not author) |
| `404` | Not found |
| `409` | Conflict (duplicate email/username) |
| `429` | Rate limit |
| `503` | Service unavailable (e.g. DB down) |

---

## WebSockets

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessJwt },
});

socket.on('connected', ({ userId }) => { /* ready */ });
```

| Env var | Default | Description |
|---------|---------|-------------|
| `SOCKET_ENABLED` | `true` | Disable with `false` |
| `SOCKET_PATH` | `/socket.io` | HTTP path |
| `ALLOWED_ORIGINS` | — | Same as REST CORS |

Each user joins `user:<userId>`. Join `feed:join`, `post:join`, or `conversation:join` for scoped events. Full event list: [docs/client-agent.md](docs/client-agent.md).

---

## API documentation

| URL | Description |
|-----|-------------|
| `/api-docs` | Swagger UI |
| `/api-docs.json` | OpenAPI JSON |
| [docs/client-agent.md](docs/client-agent.md) | Client types, flows, socket contracts |

Regenerate Postman collection after OpenAPI changes:

```bash
npm run postman:build
```

Import into Postman:

- `postman/api.postman_collection.json` — REST (+ Socket.IO docs folder at top)
- `postman/socket-io.postman_collection.json` — Socket.IO connect / `feed:join` examples
- `postman/api.local.postman_environment.json` — `http://localhost:3000`
- `postman/api.production.postman_environment.json` — `https://feed-app-server.onrender.com`

In Swagger UI (`/api-docs`), use the **Servers** dropdown to switch between local and production. The API intro includes a **Real-time (Socket.IO)** section (reference only — not interactive).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with file watching |
| `npm start` | Start production server |
| `npm test` | Run integration tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run postman:build` | OpenAPI → Postman |
| `npm run check` | lint + format + test + postman |

---

## Testing

Vitest + Supertest + `mongodb-memory-server`. Tests never touch your dev database.

```bash
npm test
```

Coverage includes auth, users, uploads, posts (feed/comments/likes), chat (messages, read/delivery receipts), and sockets.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |
| Real-time | Socket.IO |
| Validation | Zod |
| API docs | swagger-jsdoc, swagger-ui-express |
| Tests | Vitest, Supertest |

---

## License

ISC
