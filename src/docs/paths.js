/**
 * OpenAPI path definitions for swagger-jsdoc.
 *
 * IMPORTANT: API behavior lives in modules/ — this file is the docs source.
 * When you change routes or request/response shapes, update this file AND
 * schemas in swagger.js, then refresh /api-docs (no server restart needed).
 */

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: |
 *       Returns OK when the server and MongoDB are reachable.
 *       Load balancers should treat **503** as unhealthy.
 *     responses:
 *       200:
 *         description: Server and database are healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Database unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: |
 *       Creates the account with `emailVerified: false` and emails a 6-digit verification code.
 *       Login is blocked until `POST /auth/verify-email` succeeds.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseUser'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       409:
 *         description: Email or username already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiConflictError'
 *       429:
 *         description: Too many registration attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitRegisterError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with OTP
 *     description: |
 *       Submit the 6-digit code from the registration email.
 *       Returns **400** for invalid or expired codes (max attempts enforced).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Email verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseMessage'
 *       400:
 *         description: Validation failed or invalid/expired code
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ApiInvalidResetTokenError'
 *       429:
 *         description: Too many verify-email attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitVerifyEmailError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend email verification OTP
 *     description: |
 *       Sends a new verification code when the email is registered and not yet verified.
 *       Always returns the same success message to avoid email enumeration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       200:
 *         description: Generic success (sent if eligible)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseMessage'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       429:
 *         description: Too many resend attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitResendVerificationError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email or username
 *     description: |
 *       Send a single `identifier` (email or username) and `password`.
 *       Returns a short-lived access JWT in `token` and a long-lived `refreshToken`.
 *       Use `token` as `Authorization: Bearer <token>` on protected routes.
 *       When `token` expires, call `POST /auth/refresh` with `refreshToken`.
 *       Returns **403** if the account `status` is `inactive`.
 *       Returns **403** if the email is not verified (`POST /auth/verify-email` required).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseLogin'
 *       400:
 *         description: Validation failed or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ApiInvalidCredentialsError'
 *       403:
 *         description: Account is inactive or email not verified
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiInactiveAccountError'
 *                 - $ref: '#/components/schemas/ApiEmailNotVerifiedError'
 *       429:
 *         description: Too many login attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitLoginError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/social:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with Google or Apple
 *     description: |
 *       Exchange a provider `idToken` from Google Sign-In or Apple Sign-In for the same
 *       token pair returned by `POST /auth/login`.
 *
 *       - New users are created automatically (username is generated).
 *       - If the provider email matches an existing account, the provider is linked to that account.
 *       - New accounts and email linking require `emailVerified: true` from the provider (no separate app email flow).
 *       - Returning users are matched by `provider` + `providerId` and do not re-check email verification.
 *       - Returns **403** if the account `status` is `inactive`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SocialLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseLogin'
 *       400:
 *         description: Validation failed, unverified provider email, or missing email
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ApiSocialEmailRequiredError'
 *                 - $ref: '#/components/schemas/ApiSocialEmailNotVerifiedError'
 *       401:
 *         description: Invalid or expired social token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInvalidSocialTokenError'
 *       403:
 *         description: Account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInactiveAccountError'
 *       429:
 *         description: Too many social login attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitSocialLoginError'
 *       503:
 *         description: Social provider is not configured on the server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSocialProviderNotConfiguredError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: |
 *       Exchange a valid `refreshToken` for a new access `token` and rotated `refreshToken`.
 *       The previous refresh token is invalidated (single-use rotation).
 *       Returns **403** if the account `status` is `inactive`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseRefreshTokens'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInvalidRefreshTokenError'
 *       403:
 *         description: Account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInactiveAccountError'
 *       429:
 *         description: Too many refresh attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitRefreshError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (revoke refresh token)
 *     description: |
 *       Invalidates the provided `refreshToken` server-side.
 *       Access tokens remain valid until they expire (keep them short-lived).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Refresh token revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseMessage'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       429:
 *         description: Too many logout attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitLogoutError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset OTP
 *     description: |
 *       Send the user's email. If the account has a password, a 6-digit reset code is emailed.
 *       Always returns the same success message to avoid email enumeration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Generic success (sent if email is registered)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseMessage'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       429:
 *         description: Too many password reset requests from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitForgotPasswordError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password with email and OTP
 *     description: |
 *       Use the 6-digit code from the reset email together with the account email.
 *       On success, all refresh tokens for that user are revoked server-side.
 *       Log in separately with the new password to obtain a new token pair.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseMessage'
 *       400:
 *         description: Validation failed or invalid/expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ApiInvalidResetTokenError'
 *       429:
 *         description: Too many reset attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitResetPasswordError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

/**
 * @openapi
 * /api/v1/auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Start TOTP two-factor setup
 *     description: |
 *       Returns a TOTP secret and `otpauth://` URL for the authenticator app.
 *       Call `POST /auth/2fa/confirm` with a valid code to enable 2FA.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/TwoFactorSetupResponse' }
 *                 message: { type: 'string' }
 *       400:
 *         description: Two-factor authentication is already enabled
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /api/v1/auth/2fa/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm and enable two-factor authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmTwoFactorRequest'
 *     responses:
 *       200:
 *         description: Two-factor authentication enabled
 *       400:
 *         description: Invalid or expired setup, or invalid authenticator code
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /api/v1/auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Complete login with a TOTP code
 *     description: |
 *       Used after `POST /auth/login` or `POST /auth/social` when the response
 *       has `requiresTwoFactor: true`. Returns the same token pair as a normal login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyTwoFactorLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseLogin'
 *       400:
 *         description: Invalid authenticator code
 *       401:
 *         description: Invalid or expired two-factor token
 */

/**
 * @openapi
 * /api/v1/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Disable two-factor authentication
 *     description: |
 *       Requires a valid TOTP code. Password is required when the account has a password.
 *       Revokes all refresh tokens for the user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisableTwoFactorRequest'
 *     responses:
 *       200:
 *         description: Two-factor authentication disabled
 *       400:
 *         description: Not enabled, invalid code, or missing password
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /api/v1/uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload one or more files
 *     description: |
 *       Multipart upload using field name `files` (repeat for multiple files).
 *       Storage backend is selected via `UPLOAD_DRIVER` (`local`, `s3`, `cloudinary`).
 *       When `UPLOAD_PUBLIC_ACCESS=false`, response `url` values point to
 *       `GET /uploads/{id}/download` (JWT required).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UploadFilesRequest'
 *     responses:
 *       201:
 *         description: Files uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseUploadFiles'
 *       400:
 *         description: No files, invalid type, or too many files
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiUploadError'
 *                 - $ref: '#/components/schemas/ApiValidationErrorResponse'
 *                 - $ref: '#/components/schemas/ApiErrorMessageResponse'
 *       401:
 *         description: Missing, invalid, or expired token
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiAuthRequiredError'
 *                 - $ref: '#/components/schemas/ApiInvalidTokenError'
 *       413:
 *         description: File exceeds UPLOAD_MAX_FILE_SIZE
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiFileTooLargeError'
 *       429:
 *         description: Upload rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitUploadError'
 */

/**
 * @openapi
 * /api/v1/uploads/{fileId}/download:
 *   get:
 *     tags: [Uploads]
 *     summary: Download an active uploaded file
 *     description: |
 *       Streams an active file to the client. Requires a valid JWT.
 *       Used when `UPLOAD_PUBLIC_ACCESS=false` (default in production).
 *       Pass the file `id` from the upload response (recommended), or the stored `name`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: File `id` from the upload response, or stored `name`
 *     responses:
 *       200:
 *         description: File stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Missing, invalid, or expired token
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiAuthRequiredError'
 *                 - $ref: '#/components/schemas/ApiInvalidTokenError'
 *       404:
 *         description: File not found or archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiNotFoundError'
 *       429:
 *         description: Upload rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitUploadError'
 */

/**
 * @openapi
 * /api/v1/uploads/{fileId}:
 *   delete:
 *     tags: [Uploads]
 *     summary: Archive an uploaded file (soft delete)
 *     description: |
 *       Moves a file out of the active storage location so clients can no longer access it
 *       at the original URL. The file is retained under an archive prefix/folder for
 *       server-side recovery (`UPLOAD_ARCHIVE_PREFIX`, default `_archive`).
 *       Only the user who uploaded the file may archive it.
 *       Pass the MongoDB `id` from the upload response (recommended), or the stored `name`.
 *       For Cloudinary `public_id` values that contain `/`, prefer `id` or URL-encode the name.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: File `id` from the upload response, or stored `name`
 *         example: 664a1b2c3d4e5f678901234567
 *     responses:
 *       200:
 *         description: File archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseArchiveUpload'
 *       400:
 *         description: Invalid file name or file already archived in storage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       401:
 *         description: Missing, invalid, or expired token
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiAuthRequiredError'
 *                 - $ref: '#/components/schemas/ApiInvalidTokenError'
 *       404:
 *         description: File not found or not owned by the current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiNotFoundError'
 *       429:
 *         description: Upload rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiRateLimitUploadError'
 */

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get logged-in user profile
 *     description: |
 *       Returns the full profile including a hydrated `profilePicture` object (or `null`).
 *       Auth responses from login/register/social do not include `profilePicture`.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseUserProfile'
 *       401:
 *         description: Missing, invalid, or expired token
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiAuthRequiredError'
 *                 - $ref: '#/components/schemas/ApiInvalidTokenError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiUserNotFoundError'
 */

/**
 * @openapi
 * /api/v1/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update logged-in user profile
 *     description: |
 *       Partial update for the authenticated user. Send one or more of
 *       `firstName`, `lastName`, `username`, `bio`, or `profilePicture`.
 *       Email and password cannot be changed here.
 *       For `profilePicture`, send the upload `id` from `POST /uploads`, or `null` to remove.
 *       Responses return `profilePicture` as the full upload file object (including `url`).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponseUserUpdated'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiValidationErrorResponse'
 *       401:
 *         description: Missing, invalid, or expired token
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiAuthRequiredError'
 *                 - $ref: '#/components/schemas/ApiInvalidTokenError'
 *       403:
 *         description: Email not verified or account inactive
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiEmailNotVerifiedError'
 *                 - $ref: '#/components/schemas/ApiInactiveAccountError'
 *       409:
 *         description: Username already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiConflictError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiUserNotFoundError'
 *       413:
 *         description: JSON body exceeds JSON_BODY_LIMIT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiJsonBodyTooLargeError'
 */

module.exports = {};
