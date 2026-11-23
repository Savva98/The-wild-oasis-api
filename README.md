# The Wild Oasis Server

Backend API for The Wild Oasis application, built with Node.js, Express, and MongoDB.

## Overview

This project provides a REST API for managing a hotel-style workflow:

- authentication and session flows (JWT access/refresh tokens)
- two-factor authentication (2FA) related endpoints
- cabins management
- bookings management (including check-in/check-out operations)
- guests management
- global settings management

The app also includes middleware for security hardening, request sanitization, and central error handling.

## Main Capabilities

- JWT-based auth with refresh token flow
- Role-based access control (admin/guest)
- Password reset and MFA-related login flow
- Image upload/resize pipeline (cabins and guest photos)
- Query features/filtering support for list endpoints
- Security middleware:
  - helmet
  - rate limiting
  - CORS
  - HPP protection
  - Mongo and XSS sanitization
- Structured logging and centralized error handling

## Tech Stack

- Node.js (engine >= 22.10.0)
- Express 5
- MongoDB + Mongoose
- Jest + Supertest for tests
- Sharp for image processing
- Nodemailer for email workflows

## Project Structure

```text
.
├─ app.js                     # Express app, middleware, route mounting
├─ server.js                  # Environment bootstrapping + DB connect + server start
├─ config.env                 # Environment variables
├─ controllers/               # Route handlers/business logic
├─ models/                    # Mongoose models
├─ routes/                    # Route definitions
├─ utils/                     # Shared helpers/utilities
├─ consts/                    # Constant values
├─ public/                    # Static assets
├─ tests/                     # Jest/Supertest tests
├─ data/                      # Local JSON/mock/import data
└─ FeaturesNotImplemented/    # Experimental/incomplete features
```

## API Route Overview

Base prefix: `/api/v1`

- Auth: `/auth`
  - `POST /signup`
  - `POST /login`
  - `POST /logout`
  - `POST /forgotPassword`
  - `GET /session`
  - `POST /login-mfa`

- Sanctum/Security: `/sanctum`
  - `POST /refreshToken`
  - `PATCH /resetPassword/:token`
  - `POST /getnewCsrfToken`
  - `GET /sendTwoFactorAuth`
  - `POST /2fa/:code`
  - `GET /2fa/updatePassword`
  - `PATCH /updatePassword/:code`

- Cabins: `/cabins`
  - `GET /`
  - `GET /top-5-cheap`
  - `GET /:id`
  - `PATCH /:id` (admin)
  - `DELETE /:id` (admin)
  - `POST /addCabin` (admin)

- Bookings: `/bookings`
  - `GET /`
  - `GET /:id`
  - `GET /checkin/:id`
  - `PATCH /checkin/:id` (admin)
  - `GET /checkout/:id`
  - `PATCH /checkout/:id` (admin)
  - `GET /today-activity` (admin)
  - `DELETE /delete/:id` (admin)

- Guests: `/guests`
  - `GET /me`
  - `DELETE /deleteMe`
  - `PATCH /updateMe`
  - `GET /` (admin)
  - `GET /:id` (admin)
  - `DELETE /:id` (admin)

- Settings: `/settings`
  - `GET /` (admin)
  - `PATCH /:id` (admin)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The app reads environment variables from `config.env`.

Minimum required values:

- `NODE_ENV`
- `PORT`
- `HOST`
- `DATABASE`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`

Also configure email credentials if you use forgot-password/email features.

### 3. Run the project

```bash
npm run start
```

Server starts with Nodemon and binds to the configured host/port.

## Scripts

- `npm run start` - start server in development mode
- `npm run start:prod` - start in production mode (NODE_ENV=production)
- `npm run test` - run tests once
- `npm run test:watch` - run tests in watch mode
- `npm run debug` - run with ndb debugger

## Testing

Jest is configured in package.json:

- `testEnvironment: node`
- timeout: 10s
- verbose output enabled

Run:

```bash
npm run test
```

## Notes

- Current route files and controllers include several naming typos (for example: `rout`, `securety`, `sanctum` naming variants). They work as long as imports/exports stay consistent.
- Keep sensitive values out of version control. If credentials were committed, rotate them immediately.

## License

ISC
