<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/88ff94d3-92ae-4d81-9d79-ddbde2f31734

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying on Render (Docker)

This repository includes a multi-stage `Dockerfile`, `.dockerignore`, `server.js`, and `render.yaml` for containerized deployment on Render.

### Option 1: Render Blueprint (Recommended)
1. Push this codebase to GitHub or GitLab.
2. Log in to [Render](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Connect your repository containing `render.yaml`.
5. Render will automatically configure the Web Service with Docker runtime.
6. (Optional) Set `VITE_GOOGLE_CLIENT_ID` in environment variables if Google Sign-In is needed.

### Option 2: Web Service via Dockerfile
1. On [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Select your repository.
3. Choose **Docker** as the Runtime.
4. Set the Health Check Path to `/health`.
5. Render will automatically build using the `Dockerfile` and serve on `$PORT`.

## Local Docker Testing

Build the container image:
```bash
docker build -t whiteboard-aa .
```

Run the container locally:
```bash
docker run -p 3000:10000 whiteboard-aa
```

Access the app at `http://localhost:3000` and health status at `http://localhost:3000/health`.



## Large PDF mode (500 MB+)

This build uses range-backed PDF.js loading, IndexedDB 8 MiB PDF chunks, and
Google Drive resumable uploads/downloads. The application avoids converting
large PDFs to base64 and does not proxy large PDF bodies through Express.

For deployment, use the included `render.yaml` Node service. Configure the
production Google OAuth callback and the environment variables documented in
`docs/LARGE_PDF_ARCHITECTURE.md`.

Do not commit `.env`.
