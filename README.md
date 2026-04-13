# InsightFlow

A modern analytics dashboard with local AI-style insights and dataset exploration.

## 📁 Project Structure

```
insightflow/
├── apps/
│   ├── frontend/          # React + Vite frontend application
│   │   ├── src/
│   │   │   ├── app/                 # Main app component
│   │   │   ├── features/            # Feature modules
│   │   │   │   ├── analytics/       # Analytics feature
│   │   │   │   ├── chat/            # AI Chat feature
│   │   │   │   ├── dashboard/       # Dashboard feature
│   │   │   │   ├── data/            # Data management (api, context, model)
│   │   │   │   └── upload/          # File upload feature
│   │   │   ├── shared/              # Shared components
│   │   │   │   ├── components/      # Reusable UI components
│   │   │   │   ├── layout/          # Layout components
│   │   │   │   └── lib/             # Utility libraries
│   │   │   └── main.tsx             # Entry point
│   │   ├── public/                  # Static assets
│   │   ├── package.json             # Frontend dependencies
│   │   ├── vite.config.ts           # Vite configuration
│   │   ├── tailwind.config.ts       # Tailwind CSS config
│   │   └── tsconfig.json            # TypeScript config
│   │
│   └── backend/           # Node.js API serverless functions
│       ├── api/
│       │   └── index.js               # API route handlers
│       ├── data/                      # Data storage
│       ├── package.json               # Backend dependencies
│       ├── vercel.json                # Vercel config
│       └── README.md                  # Backend documentation
│
├── docs/                  # Project documentation
├── scripts/               # Build and utility scripts
│
├── package.json           # Root workspace config
├── package-lock.json
├── vercel.json            # Vercel deployment config
├── .env.example           # Environment variables template
├── .gitignore
├── README.md              # This file
└── DEPLOY.md              # Deployment guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install all dependencies
npm install
```

### Development

```bash
# Run both frontend and backend
npm run dev

# Run frontend only (port 8080)
npm run dev:frontend

# Run backend only (port 3001)
npm run dev:backend
```

### Build

```bash
# Build frontend for production
npm run build

# Build frontend only
npm run build:frontend
```

## 📦 Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Radix UI** - Component library
- **Recharts** - Charts
- **Axios** - HTTP client
- **TanStack Query** - Data fetching

### Backend
- **Node.js** - Runtime
- **sql.js** - SQLite database
- **Vercel** - Serverless deployment

## 🌐 Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

### Quick Deploy

1. Push to GitHub
2. Connect to Vercel
3. Deploy `apps/frontend` and `apps/backend` separately

## 📱 Features

- 📊 **Dashboard** - KPI cards and overview charts
- 📋 **Data Table** - Sortable, filterable data grid
- 📤 **File Upload** - Upload CSV/Excel files
- 💬 **AI Chat** - Ask questions about your data
- 📈 **Analytics** - Correlation analysis and insights

## 📄 License

Private project
