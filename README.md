# API Usage Dashboard

A Next.js + Tailwind CSS dashboard UI for visualizing API usage, costs, alerts, and team activity. The current build uses mock data in `pages/index.js` and is intended as a front-end template.

## Features
- KPI cards for tokens, requests, cost, and cache metrics
- Daily usage chart and model breakdown
- Alerts and usage logs
- API keys and team views
- Responsive layout

## Tech Stack
- Next.js 14 (Pages Router)
- React 18
- Tailwind CSS 3

## Getting Started
Prereqs: Node.js 18+ (see `.nvmrc`) and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Scripts
- `npm run dev` Start the dev server
- `npm run build` Build for production
- `npm run start` Run the production server

## Project Structure
- `pages/index.js` Dashboard UI and mock data
- `pages/_app.js` App wrapper
- `styles/` Global styles and Tailwind base
- `next.config.js`, `tailwind.config.js`, `postcss.config.js` Tooling config

## Data
All metrics are mocked in `pages/index.js`. Replace the mock data with API calls or server-side data fetching as needed.

## Contributing
See `CONTRIBUTING.md`.

## License
MIT. See `LICENSE`.
