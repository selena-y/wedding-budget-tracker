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

## Supabase migrations

Database changes are stored in `supabase/migrations` and must be applied to the
Supabase project before deploying app code that depends on them.

Using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref voqakqzkupoxkkwviyxp
npx supabase db push
```

Alternatively, copy the relevant migration SQL into the Supabase dashboard's
SQL Editor and run it there. Commit and push the migration alongside the app
code so the database history stays versioned.

## Notes

- Wedding and category data is stored in Supabase and syncs across devices.
- Built with [Vite](https://vitejs.dev/), React, and [Recharts](https://recharts.org/)
  for the budget breakdown chart.
