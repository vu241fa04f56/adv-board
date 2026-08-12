# OneNote — Docker + Render

This is the complete OneNote application package configured for a Render Docker Web Service.

## Docker build

The Dockerfile uses a multi-stage Node 22 build:

1. `npm ci`
2. `npm run build` (Vite frontend + bundled Express server)
3. Production-only `npm ci --omit=dev`
4. Runs `node dist/server.cjs`

Render supplies the `PORT` environment variable at runtime; the Express server listens on `0.0.0.0` and reads `process.env.PORT`.

## Render environment variables

Set these in Render. Do not commit `.env` or secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `APP_URL`
- `VITE_GOOGLE_CLIENT_ID` when the client-side Google OAuth flow is used

Production callback example:
`https://YOUR-APP.onrender.com/api/auth/google/callback`

## Local

Create `.env` from `.env.example`, then run `npm install` and `npm run dev`.

The archive intentionally excludes `node_modules`, `dist`, and `.env`.
