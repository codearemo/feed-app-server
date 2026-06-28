# Express API Boilerplate

A production-ready **Express REST API starter** you can fork for new projects. Layered architecture (routes → controller → service → repository → model), JWT auth with refresh tokens, email OTP verification, TOTP 2FA, social login (Google/Apple), file uploads (local/S3/Cloudinary), Socket.IO, OpenAPI docs, and Vitest integration tests.

---

## Using as a boilerplate

1. **Fork or clone** this repo and rename the project folder.
2. **Update branding** — search for `express-api-boilerplate`, `Express API Boilerplate`, and `my-app` / `my_app`; replace with your product name.
3. **Configure `.env`** — copy `.env.example`, set `JWT_SECRET`, `MONGO_URI`, SMTP, and optional social/upload keys.
4. **Customize OpenAPI** — edit titles in `src/docs/swagger.js` and route docs in `src/docs/paths.js`, then run `npm run postman:build`.
5. **Add modules** — follow the pattern in `src/modules/users/` or `src/modules/auth/` (routes, controller, `services/`, repository, model).
6. **Prune what you don't need** — e.g. remove 2FA routes, social auth, or upload drivers if your app is simpler.

---

## Features

- **Versioned API** — all routes under `/api/v1`
- **Auth** — register, email verification (OTP), login, social login (Google, Apple), OTP forgot/reset password, JWT access + refresh tokens
- **2FA** — TOTP authenticator apps (setup, confirm, login challenge, disable)
- **Users** — protected profile (`GET/PATCH /users/me`) with optional profile picture via upload file reference
- **Uploads** — multipart upload (`POST /uploads`) with switchable storage: `local`, `s3`, or `cloudinary`
- **WebSockets** — Socket.IO with JWT handshake, per-user rooms
- **Validation** — Zod schemas with field-level error `details`
- **Uniform responses** — consistent `{ data, message, details?, pagination? }` envelope
- **Password security** — bcrypt hashing, passwords never returned in API responses
- **Rate limiting** — global per-IP baseline on all routes, plus stricter limits on auth endpoints
- **Security headers** — Helmet; CORS via configurable origin list; JSON body size limit
- **API docs** — Swagger UI at `/api-docs`, OpenAPI JSON at `/api-docs.json`
- **Postman** — collection generated from OpenAPI via `npm run postman:build`
- **Linting & formatting** — ESLint + Prettier

---



## Tech Stack


| Layer              | Technology                        |
| ------------------ | --------------------------------- |
| Runtime            | Node.js                           |
| Framework          | Express 5                         |
| Database (current) | MongoDB via Mongoose              |
| Database (planned) | MySQL via Sequelize               |
| Auth               | JWT (`jsonwebtoken`) + bcrypt     |
| Validation         | Zod                               |
| API docs           | swagger-jsdoc, swagger-ui-express |


---



## Project Structure

```
<your-project>/
├── postman/                    # Generated Postman collection & environment
├── scripts/
│   └── build-postman.js        # OpenAPI → Postman converter
├── src/
│   ├── api/v1/                 # Version router (mounts module routes)
│   ├── config/                 # Environment-based configuration
│   ├── database/               # DB connection lifecycle (mongo | sql)
│   ├── docs/                   # OpenAPI spec (paths.js + swagger.js)
│   ├── middleware/             # authenticate, error handler, rate limit, security
│   ├── modules/
│   │   ├── auth/               # Auth routes, services/, repositories, models
│   │   ├── files/              # Uploads — storage drivers, soft delete
│   │   └── users/              # User profile
│   ├── socket/                 # Socket.IO — JWT auth, connection handlers
│   ├── utils/                  # Shared helpers (mail, otp, totp, etc.)
│   ├── app.js                  # Express app setup
│   └── server.js               # HTTP server + Socket.IO entry point
├── tests/                      # Vitest integration & unit tests
├── .env.example
└── package.json
```



### Request flow

```
HTTP Request
  → app.js (express.json, routes)
  → api/v1 (version prefix)
  → module routes (auth / users)
  → controller        ← HTTP in/out only
  → service           ← business rules, validation
  → repository        ← database driver switch
  → model (Mongoose)  → MongoDB
```

---



## Getting Started



### Prerequisites

- Node.js 20+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- npm



### Installation

```bash
git clone <repository-url>
cd <your-project>
npm install
```



### Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Or create a `.env` file manually:

```env
PORT=3000

# JWT — access token (short-lived) + refresh token (long-lived, stored hashed in DB)
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Social login — client IDs from Google Cloud / Apple Developer
GOOGLE_CLIENT_ID=
APPLE_CLIENT_ID=

# CORS — comma-separated list of allowed browser origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Max JSON request body size (default: 10kb)
JSON_BODY_LIMIT=10kb

# Database driver: mongo | sql
DB_DRIVER=mongo

# MongoDB
MONGO_URI=mongodb://localhost:27017/my-app

# SQL (when DB_DRIVER=sql)
SQL_DIALECT=mysql
SQL_HOST=localhost
SQL_PORT=3306
SQL_DATABASE=my_app
SQL_USER=root
SQL_PASSWORD=

# Password reset email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="App <noreply@example.com>"
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5

# Auth rate limits (per IP)
RATE_LIMIT_GLOBAL_MAX=200
RATE_LIMIT_GLOBAL_WINDOW_MS=900000
RATE_LIMIT_REGISTER_MAX=10
RATE_LIMIT_REGISTER_WINDOW_MS=300000
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW_MS=300000
RATE_LIMIT_FORGOT_PASSWORD_MAX=5
RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS=300000
RATE_LIMIT_RESET_PASSWORD_MAX=10
RATE_LIMIT_RESET_PASSWORD_WINDOW_MS=300000
RATE_LIMIT_VERIFY_EMAIL_MAX=10
RATE_LIMIT_VERIFY_EMAIL_WINDOW_MS=300000
RATE_LIMIT_RESEND_VERIFICATION_MAX=5
RATE_LIMIT_RESEND_VERIFICATION_WINDOW_MS=300000
RATE_LIMIT_REFRESH_MAX=20
RATE_LIMIT_REFRESH_WINDOW_MS=300000
RATE_LIMIT_LOGOUT_MAX=20
RATE_LIMIT_LOGOUT_WINDOW_MS=300000
RATE_LIMIT_SOCIAL_LOGIN_MAX=10
RATE_LIMIT_SOCIAL_LOGIN_WINDOW_MS=300000
```


| Variable                                   | Required | Description                                                                                                                              |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                     | No       | Server port (default: `3000`)                                                                                                            |
| `JWT_SECRET`                               | Yes      | Secret for signing JWTs                                                                                                                  |
| `JWT_EXPIRES_IN`                           | No       | Access token expiry (default: `15m`)                                                                                                     |
| `JWT_REFRESH_EXPIRES_IN`                   | No       | Refresh token expiry (default: `7d`)                                                                                                     |
| `GOOGLE_CLIENT_ID`                         | No*      | Google OAuth client ID for `POST /auth/social` with `provider: google`                                                                   |
| `APPLE_CLIENT_ID`                          | No*      | Apple Services ID for `POST /auth/social` with `provider: apple`                                                                         |
| `ALLOWED_ORIGINS`                          | No       | Comma-separated frontend URLs for CORS — required before a browser app can call the API cross-origin                                     |
| `JSON_BODY_LIMIT`                          | No       | Max JSON body size (default: `10kb`)                                                                                                     |
| `DB_DRIVER`                                | No       | `mongo` or `sql` (default: `mongo`)                                                                                                      |
| `MONGO_URI`                                | Yes†     | MongoDB connection string                                                                                                                |
| `SQL_*`                                    | Yes††    | MySQL settings when using SQL driver                                                                                                     |
| `SMTP_HOST`                                | Yes†††   | SMTP server hostname                                                                                                                     |
| `SMTP_PORT`                                | No       | SMTP port (default: `587`)                                                                                                               |
| `SMTP_SECURE`                              | No       | Use TLS (`true`/`false`, default: `false`)                                                                                               |
| `SMTP_USER`                                | Yes†††   | SMTP username                                                                                                                            |
| `SMTP_PASS`                                | Yes†††   | SMTP password                                                                                                                            |
| `SMTP_FROM`                                | No       | From address (defaults to `SMTP_USER`)                                                                                                   |
| `OTP_EXPIRES_MINUTES`                      | No       | OTP expiry for verify-email and reset-password (default: `10`)                                                                           |
| `OTP_MAX_ATTEMPTS`                         | No       | Max failed OTP attempts before invalidation (default: `5`)                                                                               |
| `RATE_LIMIT_GLOBAL_MAX`                    | No       | Max requests per IP across all routes (default: `200`)                                                                                   |
| `RATE_LIMIT_GLOBAL_WINDOW_MS`              | No       | Global window in ms (default: `900000` = 15 min)                                                                                         |
| `RATE_LIMIT_REGISTER_MAX`                  | No       | Max register requests per IP per window (default: `10`)                                                                                  |
| `RATE_LIMIT_REGISTER_WINDOW_MS`            | No       | Register window in ms (default: `300000` = 5 min)                                                                                        |
| `RATE_LIMIT_LOGIN_MAX`                     | No       | Max login requests per IP per window (default: `10`)                                                                                     |
| `RATE_LIMIT_LOGIN_WINDOW_MS`               | No       | Login window in ms (default: `300000` = 5 min)                                                                                           |
| `RATE_LIMIT_FORGOT_PASSWORD_MAX`           | No       | Max forgot-password requests per IP (default: `5`)                                                                                       |
| `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS`     | No       | Forgot-password window in ms (default: `300000` = 5 min)                                                                                 |
| `RATE_LIMIT_RESET_PASSWORD_MAX`            | No       | Max reset-password requests per IP (default: `10`)                                                                                       |
| `RATE_LIMIT_RESET_PASSWORD_WINDOW_MS`      | No       | Reset-password window in ms (default: `300000` = 5 min)                                                                                  |
| `RATE_LIMIT_VERIFY_EMAIL_MAX`              | No       | Max verify-email requests per IP (default: `10`)                                                                                         |
| `RATE_LIMIT_VERIFY_EMAIL_WINDOW_MS`        | No       | Verify-email window in ms (default: `300000` = 5 min)                                                                                    |
| `RATE_LIMIT_RESEND_VERIFICATION_MAX`       | No       | Max resend-verification requests per IP (default: `5`)                                                                                   |
| `RATE_LIMIT_RESEND_VERIFICATION_WINDOW_MS` | No       | Resend-verification window in ms (default: `300000` = 5 min)                                                                             |
| `RATE_LIMIT_REFRESH_MAX`                   | No       | Max refresh requests per IP (default: `20`)                                                                                              |
| `RATE_LIMIT_REFRESH_WINDOW_MS`             | No       | Refresh window in ms (default: `300000` = 5 min)                                                                                         |
| `RATE_LIMIT_LOGOUT_MAX`                    | No       | Max logout requests per IP (default: `20`)                                                                                               |
| `RATE_LIMIT_LOGOUT_WINDOW_MS`              | No       | Logout window in ms (default: `300000` = 5 min)                                                                                          |
| `RATE_LIMIT_SOCIAL_LOGIN_MAX`              | No       | Max social login requests per IP (default: `10`)                                                                                         |
| `RATE_LIMIT_SOCIAL_LOGIN_WINDOW_MS`        | No       | Social login window in ms (default: `300000` = 5 min)                                                                                    |
| `UPLOAD_DRIVER`                            | No       | Storage backend: `local`, `s3`, or `cloudinary` (default: `local`)                                                                       |
| `UPLOAD_PUBLIC_ACCESS`                     | No       | Serve local files at `/uploads` without JWT (default: `true` only when `NODE_ENV` is `development` or `test`; set explicitly in staging) |
| `UPLOAD_MAX_FILE_SIZE`                     | No       | Max bytes per file (default: `5242880` = 5MB)                                                                                            |
| `UPLOAD_MAX_FILES`                         | No       | Max files per request (default: `10`)                                                                                                    |
| `UPLOAD_ALLOWED_MIME_TYPES`                | No       | Comma-separated allowlist (default: JPEG, PNG, GIF, WebP, PDF)                                                                           |
| `UPLOAD_DIR`                               | No*      | Local storage directory (default: `uploads/`)                                                                                            |
| `UPLOAD_BASE_URL`                          | No*      | Public base URL for local files (default: `http://localhost:<PORT>`)                                                                     |
| `S3_BUCKET`                                | Yes**    | S3 bucket name                                                                                                                           |
| `S3_REGION`                                | No**     | AWS region (default: `us-east-1`)                                                                                                        |
| `S3_ACCESS_KEY_ID`                         | Yes**    | AWS access key                                                                                                                           |
| `S3_SECRET_ACCESS_KEY`                     | Yes**    | AWS secret key                                                                                                                           |
| `S3_PUBLIC_URL_BASE`                       | No**     | Optional CDN/base URL for S3 objects                                                                                                     |
| `CLOUDINARY_CLOUD_NAME`                    | Yes***   | Cloudinary cloud name                                                                                                                    |
| `CLOUDINARY_API_KEY`                       | Yes***   | Cloudinary API key                                                                                                                       |
| `CLOUDINARY_API_SECRET`                    | Yes***   | Cloudinary API secret                                                                                                                    |
| `CLOUDINARY_FOLDER`                        | No***    | Upload folder (default: `my-app`)                                                                                                        |


 Used when `UPLOAD_DRIVER=local`  
* Required when `UPLOAD_DRIVER=s3`  
** Required when `UPLOAD_DRIVER=cloudinary`  
† Required when `DB_DRIVER=mongo`  
†† Required when `DB_DRIVER=sql`  
††† Required when using forgot-password (real SMTP in dev and prod)

### Run the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:3000` (or your `PORT`).

---



## API Reference

Base URL: `http://localhost:3000/api/v1`

Interactive docs: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

### Endpoints


| Method   | Path                               | Auth       | Description                                                      |
| -------- | ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| `GET`    | `/health`                          | No         | Health check (includes MongoDB ping; **503** if DB unavailable)  |
| `POST`   | `/api/v1/auth/register`            | No         | Create a new user (sends email verification OTP)                 |
| `POST`   | `/api/v1/auth/verify-email`        | No         | Confirm email with 6-digit OTP                                   |
| `POST`   | `/api/v1/auth/resend-verification` | No         | Resend email verification OTP                                    |
| `POST`   | `/api/v1/auth/login`               | No         | Login — returns access `token` + `refreshToken`                  |
| `POST`   | `/api/v1/auth/social`              | No         | Social login (Google or Apple `idToken`)                         |
| `POST`   | `/api/v1/auth/refresh`             | No         | Exchange `refreshToken` for a new token pair                     |
| `POST`   | `/api/v1/auth/logout`              | No         | Revoke a `refreshToken`                                          |
| `POST`   | `/api/v1/auth/forgot-password`     | No         | Email a password reset OTP                                       |
| `POST`   | `/api/v1/auth/reset-password`      | No         | Set new password with email + OTP                                |
| `POST`   | `/api/v1/auth/2fa/setup`           | Bearer JWT | Start TOTP setup — returns `secret` + `otpauthUrl`               |
| `POST`   | `/api/v1/auth/2fa/confirm`         | Bearer JWT | Enable 2FA with a code from the authenticator app                |
| `POST`   | `/api/v1/auth/2fa/verify`          | No         | Complete login after password/social when 2FA is enabled         |
| `POST`   | `/api/v1/auth/2fa/disable`         | Bearer JWT | Disable 2FA (TOTP code + password if the account has one)        |
| `POST`   | `/api/v1/uploads`                  | Bearer JWT | Upload one or more files (`multipart/form-data`, field `files`)  |
| `GET`    | `/api/v1/uploads/:fileId/download` | Bearer JWT | Download an active file (used when `UPLOAD_PUBLIC_ACCESS=false`) |
| `DELETE` | `/api/v1/uploads/:fileId`          | Bearer JWT | Soft-delete by `id` (recommended) or `name` from upload response |
| `GET`    | `/api/v1/users/me`                 | Bearer JWT | Get logged-in user profile                                       |
| `PATCH`  | `/api/v1/users/me`                 | Bearer JWT | Update logged-in user profile                                    |




### Register

Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.

After registration, a **6-digit verification code** is emailed. Login is blocked until the email is verified.

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "username": "jane",
  "email": "jane@example.com",
  "password": "Password123!"
}
```



### Verify email

Submit the code from the registration email:

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "jane@example.com",
  "otp": "123456"
}
```

To request a new code:

```http
POST /api/v1/auth/resend-verification
Content-Type: application/json

{
  "email": "jane@example.com"
}
```

Both verify and resend endpoints use anti-enumeration messages when the email is unknown or already verified.

### Login

Send a single `identifier` — email **or** username.

Returns **403** with `"Account is inactive"` if the user's `status` is `inactive`.

Returns **403** with `"Email not verified"` until `POST /auth/verify-email` succeeds.

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "jane",
  "password": "Password123!"
}
```

Response includes a short-lived access JWT in `data.token` and a long-lived `data.refreshToken` when 2FA is **not** enabled:

```json
{
  "message": "Login successful",
  "data": {
    "requiresTwoFactor": false,
    "user": { },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f678901234567890abcd..."
  }
}
```

When 2FA **is** enabled, login and social login return a challenge instead of tokens:

```json
{
  "message": "Two-factor authentication required",
  "data": {
    "requiresTwoFactor": true,
    "twoFactorToken": "a1b2c3d4e5f678901234567890abcd1234567890abcd1234567890abcd1234"
  }
}
```

Complete sign-in with `POST /auth/2fa/verify` and a 6-digit code from the user's authenticator app.

### Two-factor authentication (TOTP)

Users can enable an authenticator app (Google Authenticator, Authy, 1Password, etc.) from an authenticated session:

```http
POST /api/v1/auth/2fa/setup
Authorization: Bearer <token>
```

Scan the returned `otpauthUrl` (or enter `secret` manually), then confirm:

```http
POST /api/v1/auth/2fa/confirm
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456" }
```

After 2FA is enabled, **password login** and **social login** require a second step — no JWT is issued until the TOTP code is verified:

```http
POST /api/v1/auth/2fa/verify
Content-Type: application/json

{
  "twoFactorToken": "<from login or social response>",
  "code": "123456"
}
```

To disable 2FA (password required when the account has a password):

```http
POST /api/v1/auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456", "password": "Password123!" }
```

Disabling 2FA revokes all refresh tokens for that user.

```

Send the access token on protected routes:

```http
Authorization: Bearer <token>
```

### Social login

The client obtains an `idToken` from the Google or Apple SDK, then exchanges it for the same token pair as password login:

```http
POST /api/v1/auth/social
Content-Type: application/json

{
  "provider": "google",
  "idToken": "<idToken from Google Sign-In>"
}
```

Supported `provider` values: `google`, `apple`.

- New users get an auto-generated username (`user_<hex>`) and `emailVerified: true` (provider already verified the email).
- If the provider email matches an **unverified** password registration, the account is linked, email is marked verified, and the squatter password is cleared — the real owner reclaims the email via the provider.
- If the provider email matches an **already verified** password account, the provider is linked and password login continues to work.
- **No separate verify-email OTP for social sign-up** — Google/Apple verify ownership; the server only accepts tokens where the provider sets `emailVerified: true` (for new sign-ups and linking).
- Social-only accounts cannot use password login (`400` — `This account uses social login`).

When the access token expires, exchange the refresh token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken from login>"
}
```

To sign out, revoke the refresh token:

```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

### Forgot password

Send the user's email. If the account has a password, a **6-digit reset code** is emailed.

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "jane@example.com"
}
```

Always returns the same success message — even if the email is not registered or email delivery fails.

In development (`NODE_ENV=development`), the OTP is also logged to the console.

### Reset password

Use the code from the email together with the account email. On success, **all refresh tokens for that user are revoked** — existing sessions cannot refresh. Log in separately with the new password to get a new token pair.

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "jane@example.com",
  "otp": "123456",
  "password": "Newpassword123!"
}
```

### Get profile

Returns the full profile including a hydrated `profilePicture` object (or `null`). Auth responses from login/register/social do **not** include `profilePicture` — use this endpoint after sign-in.

```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

### Update profile

Partial update — send one or more fields. Email and password cannot be changed here.

```http
PATCH /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Janet",
  "lastName": "Smith",
  "username": "janet",
  "bio": "Building cool things."
}
```

Updatable fields: `firstName`, `lastName`, `username`, `bio` (max 500 characters), `profilePicture` (upload file id or `null` to remove).

To set a profile picture, upload an image via `POST /uploads`, then pass the returned `id`:

```http
PATCH /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "profilePicture": "664a1b2c3d4e5f678901234567"
}
```

`GET /users/me` returns `profilePicture` as the full upload object (including `url`), or `null`.

### Upload files

Send one or more files as `multipart/form-data` with field name `files` (repeat the field for multiple files). Requires JWT.

```http
POST /api/v1/uploads
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <photo-one.jpg>
files: <photo-two.jpg>
```

**Success (201):**

```json
{
  "message": "Files uploaded successfully",
  "data": [
    {
      "id": "664a1b2c3d4e5f678901234567",
      "url": "http://localhost:3000/uploads/a1b2c3d4e5f678901234567890abcd12.jpg",
      "name": "a1b2c3d4e5f678901234567890abcd12.jpg",
      "originalName": "photo-one.jpg",
      "mimeType": "image/jpeg",
      "size": 20480,
      "encoding": "7bit",
      "provider": "local"
    }
  ]
}
```

Set `UPLOAD_DRIVER` in `.env` to pick the storage backend (same idea as `DB_DRIVER`):


| Driver       | Behavior                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`      | Files saved under `UPLOAD_DIR`. Public `/uploads/<name>` when `UPLOAD_PUBLIC_ACCESS=true`; otherwise use `GET /uploads/:id/download` with JWT |
| `s3`         | Files uploaded to AWS S3; response URLs point to S3 (or `S3_PUBLIC_URL_BASE`) when public; otherwise auth-protected download route            |
| `cloudinary` | Files uploaded to Cloudinary; response URLs are Cloudinary CDN links when public; otherwise auth-protected download route                     |


**Default:** `UPLOAD_PUBLIC_ACCESS` is `true` only when `NODE_ENV` is `development` or `test`. For staging and production, set `UPLOAD_PUBLIC_ACCESS=false` explicitly. Anonymous users cannot fetch files by URL; only the **uploader** can download active files via `GET /api/v1/uploads/:fileId/download` with a valid JWT.

Default limits: **5MB per file**, **10 files** per request. Allowed types: JPEG, PNG, GIF, WebP, PDF.

### Archive a file (soft delete)

Moves a file out of active storage so the original URL no longer works. Only the **user who uploaded the file** can archive it. The file is retained under an internal archive location (`UPLOAD_ARCHIVE_PREFIX`, default `_archive`) for server-side recovery.

```http
DELETE /api/v1/uploads/664a1b2c3d4e5f678901234567
Authorization: Bearer <token>
```

Use the `id` from the upload response (recommended). You can also pass `name` instead of `id`. For Cloudinary `public_id` values that contain `/`, prefer `id` over URL-encoding the name.

Upload metadata (owner, `id`, `name`, `provider`, status) is stored in MongoDB when files are uploaded. If the database write fails after storage, uploaded blobs are rolled back automatically.


| Driver       | Active storage                    | Archive location                                   |
| ------------ | --------------------------------- | -------------------------------------------------- |
| `local`      | `UPLOAD_DIR` (public `/uploads/`) | `UPLOAD_ARCHIVE_DIR` (not publicly served)         |
| `s3`         | Bucket root key                   | `_archive/<name>` key (original URL stops working) |
| `cloudinary` | `CLOUDINARY_FOLDER/<id>`          | `CLOUDINARY_FOLDER/_archive/<id>` via rename       |


---

## Response Format

All `/api/v1` responses use a uniform envelope.

### Success

```json
{
  "data": { },
  "message": "Login successful"
}
```

### Success with pagination (list endpoints)

```json
{
  "data": [ ],
  "message": "Posts fetched successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error

```json
{
  "data": null,
  "message": "Invalid email address",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

`details` appears only for validation errors. `pagination` appears only on paginated list endpoints.

### HTTP status codes


| Code  | Meaning                                               |
| ----- | ----------------------------------------------------- |
| `200` | Success                                               |
| `201` | Resource created                                      |
| `400` | Validation failed or bad login credentials            |
| `401` | Missing or invalid JWT (protected routes)             |
| `404` | Resource not found                                    |
| `409` | Conflict (duplicate email/username)                   |
| `413` | Request body too large (exceeds `JSON_BODY_LIMIT`)    |
| `429` | Too many requests (rate limit exceeded)               |
| `500` | Internal server error                                 |
| `503` | Service unavailable (e.g. database down on `/health`) |


---

## Authentication

```
1. POST /auth/login     →  { data: { requiresTwoFactor, user?, token?, refreshToken?, twoFactorToken? } }
2. POST /auth/2fa/verify (when requiresTwoFactor) → full token pair
3. Store tokens         →  access token in memory; refresh token in httpOnly cookie or secure storage
4. Protected requests   →  Authorization: Bearer <token>
5. POST /auth/refresh   →  new token pair when access token expires (refresh token rotates)
6. authenticate MW      →  sets req.user.id from JWT payload
```

Access JWT payload contains only `{ sub: userId }` — no email or password in the token. Refresh tokens are opaque random strings (64-char hex) stored **hashed** (SHA-256) in MongoDB. Refresh uses single-use rotation: the old token is deleted before a new one is issued.

### Inactive accounts

Users have `status: active | inactive` (default `active`). **Login**, **refresh**, **social login**, and **all protected routes** return **403** `"Account is inactive"` when `status` is `inactive`.

### Rate limiting

Every request passes a **global** per-IP limit first. Auth routes also have **stricter** per-endpoint limits.


| Layer                        | Default limit | Window     |
| ---------------------------- | ------------- | ---------- |
| **Global** (all routes)      | 200 requests  | 15 minutes |
| `POST /auth/register`        | 10 requests   | 5 minutes  |
| `POST /auth/login`           | 10 requests   | 5 minutes  |
| `POST /auth/social`          | 10 requests   | 5 minutes  |
| `POST /auth/forgot-password` | 5 requests    | 5 minutes  |
| `POST /auth/reset-password`  | 10 requests   | 5 minutes  |
| `POST /auth/refresh`         | 20 requests   | 5 minutes  |
| `POST /auth/logout`          | 20 requests   | 5 minutes  |


When exceeded, the API returns **429** with `{ data: null, message: "Too many …" }`. Tune via `RATE_LIMIT_`* env vars. Limits are disabled when `NODE_ENV=test`.

### WebSockets (Socket.IO)

Real-time connections use **Socket.IO** on the same port as the REST API (path `/socket.io` by default). Authentication uses the same **access JWT** as HTTP — pass it in the handshake:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessJwt },
});

socket.on('connected', ({ userId }) => {
  console.log('socket ready for user', userId);
});
```

Each authenticated socket joins a private room `user:<userId>` so the server can target events later via `getIo().to(userRoom(userId)).emit(...)`.

| Env var | Default | Description |
|---------|---------|-------------|
| `SOCKET_ENABLED` | `true` | Set `false` to disable WebSocket server |
| `SOCKET_PATH` | `/socket.io` | Socket.IO HTTP path |
| `ALLOWED_ORIGINS` | — | Same CORS origins as REST (required for browser clients) |

---

## API Documentation

### Swagger (live)


| URL              | Description            |
| ---------------- | ---------------------- |
| `/api-docs`      | Interactive Swagger UI |
| `/api-docs.json` | Raw OpenAPI JSON       |


Docs are generated from `src/docs/paths.js` and `src/docs/swagger.js`. Edit those files, then refresh the browser — no server restart needed.

When you change API behavior, update the docs in `src/docs/` to match.

### Postman

Generate a collection from the OpenAPI spec:

```bash
npm run postman:build
```

Outputs to `postman/`:

- `api.postman_collection.json`
- `api.local.postman_environment.json`
- `openapi.json`

Import both JSON files into Postman, or import directly from `http://localhost:3000/api-docs.json` when the server is running.

---

## Scripts


| Command                 | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Start server with file watching                                   |
| `npm start`             | Start server                                                      |
| `npm run lint`          | Run ESLint on `src/` and `scripts/`                               |
| `npm run lint:fix`      | Auto-fix ESLint issues                                            |
| `npm run format`        | Format code with Prettier                                         |
| `npm run format:check`  | Check formatting without writing                                  |
| `npm run postman:build` | Generate Postman collection from OpenAPI                          |
| `npm test`              | Run integration tests (Vitest + Supertest)                        |
| `npm run test:watch`    | Run tests in watch mode                                           |
| `npm run check`         | Run `lint:fix`, `format`, `test`, and `postman:build` in sequence |


---

## Testing

Integration tests use **Vitest** + **Supertest** with an in-memory MongoDB (`mongodb-memory-server`). Tests never touch your dev database.

```bash
npm test           # run once
npm run test:watch # re-run on file changes
```

Tests live under `tests/`, grouped by area (`auth/`, `files/`, `socket/`, `middleware/`, `utils/`, `config/`, `health/`). Shared setup is in `tests/setup.js`; helpers in `tests/helpers.js`.

---

### Module layout


| Module    | Responsibility                                                         |
| --------- | ---------------------------------------------------------------------- |
| `auth.*`  | Identity — register, login, social, 2FA, OTP, JWT (`services/`)      |
| `users.*` | User entity — model, repository, profile                               |
| `files.*` | File uploads — storage drivers, ownership, soft delete                 |
| `socket/` | Real-time — Socket.IO auth, per-user rooms, `getIo()` for server emits |


### Layer rules

- **Controllers** — HTTP only; call services, send responses via `sendSuccess`
- **Services** — business rules; no Express, no Mongoose
- **Repositories** — data access; driver switch via `DB_DRIVER`
- **Models** — Mongoose schemas (MongoDB only)

### Adding a new endpoint

1. Add route in `*.routes.js`
2. Add controller handler
3. Add service logic
4. Use repository for DB access
5. Document in `src/docs/paths.js` and `src/docs/swagger.js`
6. Run `npm run postman:build` if you use committed Postman files

---

## License

ISC