# SyncSpace

A real-time collaborative document editor. Create a document, share the link, and edit together live.

Live: https://syncspace.bipashab497.workers.dev

---

## Setup

**Requirements:** Go 1.20+, Node.js 18+, MongoDB Atlas account

### Backend

```bash
cd backend
go mod tidy
go run .
```

Set this environment variable before running:

```
MONGO_URI=mongodb+srv://your-connection-string
```

Server runs on http://localhost:8080.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on http://localhost:5173.

By default the frontend points to http://localhost:8080. If you deploy the backend, update the URLs in `src/components/Editor.tsx` and `src/pages/HomePage.tsx` to match your backend URL. Use `wss://` instead of `ws://` for WebSocket in production.

---

## Deploying

**Backend — Render**
- Root directory: `backend`
- Build command: `go build -o server .`
- Start command: `./server`
- Add `MONGO_URI` in the Environment tab

**Frontend — Cloudflare Workers**
```bash
npm run build
npx wrangler deploy
```

---

- No login required — anyone with the document URL can edit it
- Free Render instances sleep after inactivity; first load may take ~50 seconds

<img width="1919" height="971" alt="image" src="https://github.com/user-attachments/assets/5deb3bcc-164b-43d6-8fa3-c9e5d395eba2" />
