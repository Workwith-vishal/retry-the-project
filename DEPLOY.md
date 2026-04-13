# Vercel Deployment Guide

## Quick Deploy

### Option 1: Deploy from GitHub (Recommended)

1. Push code to GitHub
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click **"Add New" → "Project"**
4. Import your GitHub repository
5. **Vercel will auto-detect the projects**

#### Setup Frontend:
- Framework: `Vite`
- Root Directory: `apps/frontend`
- Click **Deploy**

#### Setup Backend:
- Create new project
- Framework: `Other`
- Root Directory: `apps/backend`
- Click **Deploy**

### Option 2: Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy Backend first
cd apps/backend
vercel --yes

# Deploy Frontend
cd ../frontend
vercel --yes
```

## Project Structure

```
├── apps/
│   ├── frontend/              # React + Vite
│   │   ├── vercel.json       # Vercel config
│   │   ├── dist/             # Built files
│   │   └── src/
│   │       └── features/data/api/dataApi.ts  # Axios API client
│   └── backend/              # Serverless API
│       ├── vercel.json       # Vercel config
│       └── api/
│           └── index.js      # API routes
├── package.json
└── DEPLOY.md
```

## Environment Variables

| Variable | Frontend Value | Description |
|----------|----------------|-------------|
| `VITE_API_URL` | (leave empty) | Frontend uses relative URLs |

> **Note:** When deployed on Vercel, frontend uses relative URLs (`/api/*`) which route to the backend API automatically.

## For Local Development

```bash
# Terminal 1 - Backend
cd apps/backend
npm run dev

# Terminal 2 - Frontend
cd apps/frontend
npm run dev
```

Frontend: http://localhost:8080
Backend: http://localhost:3001

## Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS + Axios
- **Backend**: Node.js Serverless Functions (Vercel)

## Notes
- Backend uses in-memory storage (data resets on cold start)
- For production, consider Vercel Postgres for persistence
