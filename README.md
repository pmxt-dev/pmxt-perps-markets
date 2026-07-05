# PMXT Perps Markets

A web interface for browsing and launching perpetual futures markets on PMXT.

## Features

- Browse active perp markets across categories
- Filter by Crypto, Pre-IPO, AI, Community, and Indices
- Market data including 24h price, volume, and QI metrics
- Create new perpetual markets with customizable parameters
- Real-time market updates (coming soon)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 to see the markets interface.

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React** - UI components

## Project Structure

```
app/
  layout.tsx       - Root layout
  page.tsx         - Markets page
  globals.css      - Global styles
lib/
  types.ts         - TypeScript types
  data.ts          - Sample market data
```

## Building

```bash
npm run build
npm run start
```

## TODO

- [ ] Connect to on-chain data via Web3
- [ ] Integrate with PMXT API for live market data
- [ ] Add wallet connection (Web3 modal)
- [ ] Implement market creation flow
- [ ] Add real-time price charts
- [ ] Deploy to production
