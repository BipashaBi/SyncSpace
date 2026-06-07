# SyncSpace

> A real-time collaborative document editor. Create a document, share the link, and edit together live — no login required.


**Live demo:** https://syncspace.bipashab497.workers.dev

<img width="1919" height="971" alt="SyncSpace editor" src="https://github.com/user-attachments/assets/5deb3bcc-164b-43d6-8fa3-c9e5d395eba2" />

---

## Features

- **Real-time collaborative editing** — multiple people edit the same document simultaneously; changes appear instantly for everyone.
- **Live cursors & presence** — see who else is in the document and exactly where their cursor is.
- **Typing indicators** — know the moment a collaborator starts typing.
- **Continuous autosave** — edits are saved to the database in the background; there's no save button to remember.
- **Recovery after refresh** — reload or reopen the tab and the latest version loads straight back.
- **Shareable link, no login** — anyone with the document URL can jump in and edit.
- **Rich-text editing** — powered by the Lexical editor framework.
- **Export to PDF & DOCX** — turn any document into a downloadable file to share or print.

---

## Built with

| Layer | Stack |
|-------|-------|
| **Frontend** | React, TypeScript, Lexical, Vite |
| **Backend** | Go, WebSocket (room manager + broadcast engine) |
| **Database** | MongoDB Atlas |
| **Deployment** | Cloudflare Workers (frontend) · Render (backend) |

---

## How it works

Each client runs a React + Lexical editor that turns every keystroke into a structured change. Those changes travel over a **WebSocket** connection that stays open in both directions, so edits sync in real time without polling.

On the backend, a **Go** server groups everyone editing the same document into a *room*. Its broadcast engine relays each change to every other member of that room, and writes the document to **MongoDB** so it survives a refresh and can be reloaded later.


<img width="2363" height="1173" alt="architecture" src="https://github.com/user-attachments/assets/7c5b1756-e1f9-4021-af5f-79067b3d3c42" />

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

## Notes & known limitations

- No login required — anyone with the document URL can edit it.
- Free Render instances sleep after inactivity, so the first request may take ~50 seconds to wake the backend.
