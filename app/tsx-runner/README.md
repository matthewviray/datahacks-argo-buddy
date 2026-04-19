# ArgoBuddy TSX Runner

Use this folder to run the app component at `../argobuddy-app.tsx`.

## Quick Start

```bash
cd app/tsx-runner
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Then open:

- `http://127.0.0.1:5173`
- If 5173 is busy, use the fallback URL shown in terminal (for example `5174`).

## Build Check

```bash
cd app/tsx-runner
npm run build
```

## Important

Do **not** run `npm run dev` from the repository root. There is no root `package.json`, so npm will fail there.
