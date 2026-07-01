# Feed App — Client Agent Reference

Backend for a social feed (posts, comments, likes) and 1-on-1 chat with real-time updates. Use this document when building or wiring the client against the API.

**Server README:** [../README.md](../README.md) · **OpenAPI:** `{ORIGIN}/api-docs.json`

## Base config

| Item | Value |
|------|--------|
| API base | `{ORIGIN}/api/v1` (default `http://localhost:3000/api/v1`) |
| Socket origin | Same host as API (default `http://localhost:3000`), path `/socket.io` |
| Health | `GET {ORIGIN}/health` → `{ status, database }` (not the standard envelope) |
| OpenAPI | `{ORIGIN}/api-docs.json` (REST + Socket.IO reference in intro) |
| IDs | MongoDB ObjectIds as string `id` |
| Dates | ISO 8601 (`createdAt`, `updatedAt`) |

**Client env vars:** `VITE_API_BASE_URL`, `VITE_API_ORIGIN` (socket), `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID` (must match server).

Point REST and sockets at **port 3000** — not the Vite dev server (5173). Use `VITE_API_BASE_URL=http://localhost:3000/api/v1` or a Vite proxy.

## Response envelope

**Success:** `{ data, message, pagination? }`  
**Error:** `{ data: null, message, details?: [{ field, message }] }`

Read `message` for UX; use `details` for field-level validation errors.

| Code | When |
|------|------|
| 201 | Post/comment created |
| 400 | Validation, invalid image |
| 401 | Missing/invalid JWT |
| 403 | Unverified email, inactive account, or editing someone else's post |
| 404 | Post/comment not found |
| 429 | Rate limit |

## Auth (summary)

**Header:** `Authorization: Bearer <accessToken>` on all protected routes.

```
register → verify-email (OTP) → login → [2fa/verify] → Bearer token
access expired → POST /auth/refresh → new token pair
logout → POST /auth/logout { refreshToken }
```

| Endpoint | Body |
|----------|------|
| `POST /auth/login` | `{ identifier, password }` |
| `POST /auth/social` | `{ provider: "google"\|"apple", idToken }` |
| `POST /auth/refresh` | `{ refreshToken }` |

Login with 2FA enabled returns `{ requiresTwoFactor: true, twoFactorToken }` → complete via `POST /auth/2fa/verify`.

---

## Types (TypeScript)

```ts
interface UploadFile {
  id: string;
  url: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  encoding: string;
  provider: 'local' | 's3' | 'cloudinary';
}

interface PostAuthor {
  id: string;
  name: string;
  avatar: string;           // initials, e.g. "SR"
  profilePicture: UploadFile | null;
}

interface ContentItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: PostAuthor;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  images: UploadFile[];
  likeCount: number;
  likedByMe: boolean;
}

interface FeedPost extends ContentItem {
  commentCount: number;
}

type Comment = ContentItem; // no commentCount

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PublicUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  avatar: string;
  profilePicture: UploadFile | null;
  createdAt: string;
}
```

---

## Feed implementation

### Concepts

- **Feed** = paginated top-level posts (`GET /feed`).
- **Posts** and **comments** share the same content model.
- **Likes** = up-votes. `POST` to like, `DELETE` to unlike (idempotent).
- Only the **author** can `PATCH` or `DELETE` their own post/comment (`403` otherwise).

### Content object (post or comment)

```json
{
  "id": "6a40ee6b097414b088883946",
  "title": "Why I still write long-form posts",
  "excerpt": "Short updates are easy to consume...",
  "content": "There is a difference between reacting and reflecting...",
  "author": {
    "id": "user-id",
    "name": "Sam Rivera",
    "avatar": "SR",
    "profilePicture": {
      "id": "...",
      "url": "http://localhost:3000/uploads/avatar.jpg",
      "name": "avatar.jpg",
      "originalName": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 20480,
      "encoding": "7bit",
      "provider": "local"
    }
  },
  "createdAt": "2026-06-05T18:45:00.000Z",
  "updatedAt": "2026-06-05T18:45:00.000Z",
  "tags": ["writing"],
  "images": [
    {
      "id": "...",
      "url": "http://localhost:3000/uploads/abc.jpg",
      "name": "abc.jpg",
      "originalName": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 102143,
      "encoding": "7bit",
      "provider": "local"
    }
  ],
  "likeCount": 3,
  "likedByMe": true,
  "commentCount": 5
}
```

| Field | Notes |
|-------|-------|
| `author.avatar` | Initials fallback when no profile picture (`"Sam Rivera"` → `"SR"`) |
| `author.profilePicture` | Hydrated file object or `null` — prefer over `avatar` for `<img>` when set |
| `images` | Full upload file objects (same shape as `POST /uploads` returns) |
| `commentCount` | **Only on feed posts** — omitted on comments |
| `likeCount` / `likedByMe` | Always present for the current user |

### Pagination

Query: `?page=1&limit=20` (defaults: `1`, `20`; max limit `50`). Used by `/feed` and `/posts/:postId/comments`.

### Validation (create / update)

| Field | Rules |
|-------|-------|
| `title` | Required on create; max 200 chars |
| `excerpt` | Optional; max 500 chars |
| `content` | Required on create |
| `tags` | Optional; max 20, each max 50 chars |
| `images` | Optional; max 10; images only; must belong to current user |

`PATCH` requires at least one field. Pass `images: []` to clear.

### REST endpoints

All require Bearer auth.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/feed?page&limit` | Paginated posts, newest first |
| POST | `/posts` | Create post (201) |
| GET | `/posts/:postId` | Single post |
| PATCH | `/posts/:postId` | Author only |
| DELETE | `/posts/:postId` | Soft delete, author only |
| GET | `/posts/:postId/comments?page&limit` | Comments, oldest first |
| POST | `/posts/:postId/comments` | Create comment (201) |
| GET/PATCH/DELETE | `/posts/:postId/comments/:commentId` | Comment CRUD, author only for mutating |
| POST/DELETE | `/posts/:postId/likes` | Like / unlike post |
| POST/DELETE | `/posts/:postId/comments/:commentId/likes` | Like / unlike comment |

**Create / update body:**

```json
{
  "title": "Post title",
  "excerpt": "Optional summary",
  "content": "Full body",
  "tags": ["writing"],
  "images": []
}
```

Pass **full upload file object(s)** in `images` (from `POST /uploads`; only `id` required on input).

### Client flows

**Avatar display:** use `author.profilePicture?.url` when set, else render `author.avatar` as text badge.

**Feed screen**

1. `GET /feed?page=1&limit=20`
2. `socket.emit('feed:join')` for live updates
3. Infinite scroll while `pagination.hasNextPage`

**Create post**

1. `POST /uploads` (multipart, field `files`)
2. `POST /posts` with `{ title, excerpt, content, tags, images: uploadResponse.data }`

**Post detail**

1. `GET /posts/:postId` + `GET /posts/:postId/comments`
2. `socket.emit('post:join', { postId })`
3. Listen for `comment:created`, `post:liked`, etc.

**Like toggle**

```ts
const { data } = post.likedByMe
  ? await api.delete(`/posts/${post.id}/likes`)
  : await api.post(`/posts/${post.id}/likes`);
// Update UI from data.likeCount and data.likedByMe
```

**Protected image URLs** (`UPLOAD_PUBLIC_ACCESS=false`): fetch with Bearer token → blob URL for `<img>`.

---

## Socket.IO (real-time)

```ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000', {
  auth: { token: accessToken },
});

socket.on('connected', ({ userId }) => { ... });
```

Auto-joined to `user:<userId>` for author notifications.

### Client → server

| Event | Payload | Ack |
|-------|---------|-----|
| `feed:join` | — | `{ ok: true }` |
| `feed:leave` | — | `{ ok: true }` |
| `post:join` | `{ postId }` | `{ ok: true }` or `{ ok: false, message }` |
| `post:leave` | `{ postId }` | `{ ok: true }` |
| `presence:heartbeat` | — | `{ ok: true, userId }` — send every ~30s |

### Server → client — feed room (`feed:join`)

| Event | Payload |
|-------|---------|
| `feed:post_created` | Full `FeedPost` |
| `feed:post_updated` | Full `FeedPost` |
| `feed:post_deleted` | `{ id }` |

### Server → client — post room (`post:join`)

| Event | Payload |
|-------|---------|
| `comment:created` | Full `Comment` |
| `comment:updated` | Full `Comment` |
| `comment:deleted` | `{ id, postId }` |
| `post:updated` | Full `FeedPost` |
| `post:deleted` | `{ id }` |
| `post:liked` | `{ postId, likeCount, likedBy }` |
| `post:unliked` | `{ postId, likeCount }` |
| `comment:liked` | `{ postId, commentId, likeCount, likedBy }` |
| `comment:unliked` | `{ postId, commentId, likeCount }` |

`likedBy`: `PostAuthor` (`id`, `name`, `avatar`, `profilePicture`).

### Server → client — author notifications (user room)

Not sent for your own actions.

| Event | Payload |
|-------|---------|
| `post:commented` | `{ postId, comment }` |
| `post:liked` | `{ postId, likeCount, likedBy }` |
| `comment:liked` | `{ postId, commentId, likeCount, likedBy }` |

### Server → client — presence (global)

| Event | Payload |
|-------|---------|
| `presence:online` | `{ userId }` |
| `presence:offline` | `{ userId }` |

### Socket + REST pattern

REST is the source of truth. Sockets patch UI in place:

```ts
// Feed
socket.on('feed:post_created', (post) => prependFeed(post));
socket.on('feed:post_deleted', ({ id }) => removeFeedItem(id));

// Post detail
socket.on('comment:created', (comment) => appendComment(comment));
socket.on('post:liked', ({ postId, likeCount }) => updateLikeCount(postId, likeCount));

// Notifications
socket.on('post:commented', ({ postId, comment }) => showNotification(postId, comment));
```

On unmount: `feed:leave`, `post:leave`.

---

## Chat (direct messages)

1-on-1 conversations between two users. All routes require Bearer auth.

### Types

```ts
interface ConversationSummary {
  id: string;
  participant: PublicUserProfile;
  participantLastReadAt: string | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  sender: PostAuthor;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** Present only on messages you sent — delivered to the other participant's client */
  deliveredToRecipient?: boolean;
  /** Present only on messages you sent — read by the other participant */
  readByRecipient?: boolean;
}
```

### REST endpoints — `/conversations`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/conversations?page&limit` | — | Inbox list, sorted by recent activity |
| POST | `/conversations` | `{ participantId }` | Start or return existing DM (201) |
| GET | `/conversations/:conversationId` | — | Conversation summary |
| POST | `/conversations/:conversationId/read` | — | Mark all messages read (also marks pending messages delivered) |
| GET | `/conversations/:conversationId/messages?page&limit` | — | Message history (chronological) |
| POST | `/conversations/:conversationId/messages` | `{ content }` | Send message (201, max 2000 chars) |
| POST | `/conversations/:conversationId/messages/:messageId/delivered` | — | Recipient acks message delivery |

Cannot message yourself (`400`). Non-participants get `404`. `participantId` from `GET /users/:userId` or `post.author.id`.

### Client flow

1. Open chat from user profile → `POST /conversations` `{ participantId }`
2. `socket.emit('conversation:join', { conversationId })`
3. `GET /conversations/:id/messages` → render thread
4. Send: `POST /conversations/:id/messages` `{ content }`
5. On open: `POST /conversations/:id/read` → clears `unreadCount`
6. Inbox: `GET /conversations` shows `unreadCount` + `lastMessage`
7. **Check marks** (messages you sent only):
   - ✓ **sent** — `POST .../messages` succeeds or listen for `message:sent`
   - ✓✓ **delivered** — `deliveredToRecipient: true` after recipient acks; listen for `message:delivered`
   - ✓✓ **read** (blue) — `readByRecipient: true` after `POST .../read`; listen for `conversation:read`
8. Recipient should ack delivery on `message:received` / `message:created` via `message:delivered` socket or `POST .../delivered`

### Socket — chat

**Client → server**

| Event | Payload |
|-------|---------|
| `conversation:join` | `{ conversationId }` |
| `conversation:leave` | `{ conversationId }` |
| `message:typing` | `{ conversationId }` |
| `message:stop_typing` | `{ conversationId }` |
| `message:delivered` | `{ conversationId, messageId }` — recipient acks delivery |

**Server → client**

| Event | Room | Payload |
|-------|------|---------|
| `message:created` | `conversation:<id>` | Full `ChatMessage` |
| `message:sent` | `user:<senderId>` | Full `ChatMessage` — server persisted your message |
| `message:received` | `user:<recipientId>` | `{ conversationId, message }` — inbox notification |
| `message:delivered` | `conversation:<id>` and `user:<senderId>` | `{ conversationId, messageId, deliveredAt, message }` |
| `conversation:read` | `conversation:<id>` and `user:<otherParticipantId>` | `{ conversationId, userId, readAt }` |
| `message:typing` | `conversation:<id>` | `{ conversationId, user: PostAuthor }` |
| `message:stop_typing` | `conversation:<id>` | `{ conversationId, userId }` |

```ts
socket.emit('conversation:join', { conversationId });
socket.on('message:created', appendMessage);
socket.on('message:sent', reconcileSentMessage);
socket.on('message:received', ({ conversationId, message }) => {
  updateInboxPreview(conversationId, message);
  socket.emit('message:delivered', {
    conversationId,
    messageId: message.id,
  });
});
socket.on('message:delivered', ({ messageId, message }) => {
  updateDeliveryTick(messageId, message.deliveredToRecipient);
});
socket.on('conversation:read', ({ conversationId, userId, readAt }) => {
  markMessagesReadBy(conversationId, userId, readAt);
});
socket.on('message:typing', showTypingIndicator);
```

---

## Other endpoints (brief)

### Users — `/users`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/me` | Full own profile (includes `email`, `emailVerified`, etc.) |
| PATCH | `/me` | `{ firstName?, lastName?, username?, bio?, profilePicture? }` |
| GET | `/users/:userId` | **Public profile** of another user (auth required) |

**Public profile object** (no email or account metadata):

```json
{
  "id": "...",
  "firstName": "Sam",
  "lastName": "Rivera",
  "username": "sam",
  "bio": "Building in public",
  "avatar": "SR",
  "profilePicture": null,
  "createdAt": "2026-06-05T18:45:00.000Z"
}
```

Inactive or missing users return **404**. Use `author.id` from posts to link to `/users/:userId`.

### Uploads — `/uploads`

| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | `multipart/form-data`, field `files`; 5 MB/file, 10 files max |
| GET | `/:fileId/download` | Authenticated download when not public |
| DELETE | `/:fileId` | Soft delete |

File object: `{ id, url, name, originalName, mimeType, size, encoding, provider }`.

### Auth — `/auth`

Register, verify-email, login, social, refresh, logout, forgot/reset password, 2FA. See OpenAPI at `/api-docs.json`.

---

## Agent prompts (copy into client rules)

**API client:**  
> `VITE_API_BASE_URL` → `http://localhost:3000/api/v1`. Unwrap `{ data, message, pagination? }`. Bearer JWT on all requests. Retry once after refresh on 401.

**Feed screen:**  
> `GET /feed?page&limit`. Card: `title`, `excerpt`, `author.name`, `author.profilePicture?.url ?? author.avatar`, `tags`, `images`, `likeCount`, `commentCount`, `likedByMe`. Join `feed:join` for live updates. Paginate with `hasNextPage`.

**Create / edit post:**  
> Upload via `POST /uploads`, then `POST /posts` or `PATCH /posts/:id` with full file objects in `images`. Show edit/delete only when `author.id === currentUser.id`.

**Comments:**  
> `GET /posts/:postId/comments`. Create with same body as posts. No `commentCount` on comments. Join `post:join` on detail page.

**Likes:**  
> `POST`/`DELETE` on `/posts/:id/likes`. Use `response.data` for `likeCount`/`likedByMe`. Also listen for `post:liked`/`post:unliked` on socket.

**Avatars:**  
> `PostAuthor.profilePicture` is a full `UploadFile` or `null`. Never use raw ObjectIds for display. Fall back to `avatar` initials.

**Sockets:**  
> Connect with `auth: { token }` to API origin. `feed:join` on home; `post:join` on detail; `conversation:join` on chat. Notifications on user room. Presence via `presence:online`/`offline`. Heartbeat every ~30s.

**Chat:**  
> `POST /conversations` with `participantId` to open a DM. Messages via `POST /conversations/:id/messages`. Check marks: `message:sent` (single), `message:delivered` + `deliveredToRecipient` (double), `conversation:read` + `readByRecipient` (read). Recipient acks with `message:delivered` on receive. Mark read with `POST .../read`.

**Types:**  
> `UploadFile`, `PostAuthor`, `PublicUserProfile`, `ContentItem`, `FeedPost`, `Comment`, `ConversationSummary`, `ChatMessage`.
