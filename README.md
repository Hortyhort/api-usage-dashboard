# API Usage Dashboard

A Next.js + Tailwind CSS dashboard UI for visualizing API usage, costs, alerts, and team activity. The current build uses mock data in `data/mockData.ts` and is intended as a front-end template.

## Features
- KPI cards for tokens, requests, cost, and cache metrics
- Daily usage chart and model breakdown
- Alerts and usage logs
- API keys and team views
- Password-protected access with read-only share links
- CSV/JSON exports and range-based insights
- Responsive layout

## Tech Stack
- Next.js 14 (Pages Router)
- React 18
- Tailwind CSS 3

## Getting Started
Prereqs: Node.js 18+ (see `.nvmrc`) and npm.

Copy `.env.example` to `.env.local` and add auth settings:

```bash
AUTH_SECRET=replace-with-a-long-random-string
DASHBOARD_PASSWORD=replace-with-a-strong-passcode
DASHBOARD_DATA_PATH=.data/usage.json
SHARE_STORE_PATH=.data/share-links.json
```

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Scripts
- `npm run dev` Start the dev server
- `npm run build` Build for production
- `npm run start` Run the production server
- `npm run lint` Run ESLint
- `npm run typecheck` Run TypeScript type checks
- `npm run test` Run unit tests
- `npm run format` Format files with Prettier
- `npm run format:check` Check formatting with Prettier

## Project Structure
- `pages/index.tsx` Dashboard UI shell and routing
- `pages/api/usage.ts` Mock API endpoint for dashboard data
- `components/` Reusable UI and page sections
- `data/mockData.ts` Mock dashboard dataset
- `lib/` Helpers, formatters, and API helpers
- `types/` Shared TypeScript types
- `styles/` Global styles and Tailwind base
- `next.config.js`, `tailwind.config.js`, `postcss.config.js` Tooling config

## Data
Usage data can come from a JSON file or a remote API:
- `DASHBOARD_DATA_PATH` loads a local JSON file containing `DashboardData`.
- `DASHBOARD_DATA_URL` fetches `DashboardData` from a backend endpoint (optional `DASHBOARD_DATA_TOKEN` for auth).

If neither is set, the API falls back to `data/mockData.ts` for local development.

## Authentication
The dashboard is private by default. Sign in with the `DASHBOARD_PASSWORD`, and use the Share button to generate read-only links with an expiration (and optional passcode).

## Share Auditing (Optional)
Set `SHARE_STORE_PATH` to a writable JSON file to keep a log of share links, last-used timestamps, and revocations.

## Contributing
See `CONTRIBUTING.md`.

## License
MIT. See `LICENSE`.
