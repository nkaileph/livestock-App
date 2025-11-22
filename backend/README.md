# LiveStock Track Backend - Auth API

Node.js + Express + MongoDB authentication API for the LiveStock Track platform.

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Create `.env` from `.env.example` and set JWT/email secrets.

## Scripts
- `npm run dev` - start dev server (ts-node-dev)
- `npm run build` - compile TypeScript to `dist`
- `npm start` - run compiled server
- `npm test` - placeholder for Jest

## Structure
```
src/
  config/        # env, db, mailer
  controllers/   # authController
  middleware/    # auth, validation, rate limiting, errors
  models/        # User, TokenBlacklist
  routes/        # authRoutes
  services/      # email + token helpers
  utils/         # validators, helpers, logger
  types/         # express request typings
  app.ts         # express setup
  server.ts      # entrypoint
```

## Endpoints (base `/api/v1/auth`)
- POST `/register`
- POST `/verify-email`
- POST `/login`
- POST `/refresh-token`
- POST `/logout`
- POST `/forgot-password`
- POST `/reset-password`
- GET `/me`
- PATCH `/me`
- POST `/change-password`
- POST `/resend-verification`

## Notes
- JWT access: 15m, refresh: 7d. Refresh tokens stored per user and rotated.
- Email verification + password reset tokens are hashed in DB.
- Rate limiting enabled for login/register/forgot/resend.
- Add real email transport credentials before production.
```
