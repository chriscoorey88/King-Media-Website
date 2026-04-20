# king· — agency website

Static site for King Media, built with Vite + React.

## Dev server

```
npm install
npm run dev
```

Runs at `http://localhost:5173` with HMR.

## Production build

```
npm run build
```

Output goes to `dist/`. Multi-page: `index.html`, `privacy.html`, `terms.html`.

## Preview build locally

```
npm run preview
```

## Legacy dev server

```
node serve.mjs
```

Serves `dist/` if present, otherwise falls back to project root. Runs at `http://localhost:3000`.

## Deploy

Upload the contents of `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).
