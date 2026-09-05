# Wedding Budget Tracker

A React + Vite app for tracking wedding budget vs. actual spend, by category.

## Getting started

```bash
npm install
npm run dev
```

This starts a local dev server (usually at http://localhost:5173).

## Building for production

```bash
npm run build
```

Output goes to the `dist/` folder, which you can deploy to any static host
(Netlify, Vercel, GitHub Pages, etc.).

## Notes

- Data is saved to the browser's `localStorage`, so it persists between visits
  on the same browser/device but does not sync across devices.
- Built with [Vite](https://vitejs.dev/), React, and [Recharts](https://recharts.org/)
  for the budget breakdown chart.
