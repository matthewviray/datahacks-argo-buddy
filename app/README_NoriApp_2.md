# Run NoriApp_2.jsx

This project runs `NoriApp_2.jsx` through the Vite runner in `app/tsx-runner`.

## 1) Start Dev Server

From repository root:

```bash
cd app/tsx-runner
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the URL shown in terminal.

- Usually: `http://127.0.0.1:5173/`
- If busy, Vite will auto-pick `5174`, `5175`, etc.

## 2) Build (Sanity Check)

```bash
cd app/tsx-runner
npm run build
```

## 3) Why Root npm Fails

Do **not** run `npm run dev` from repository root (`datahacks-argo-buddy/`).
There is no root `package.json`, so npm throws `ENOENT`.

Always run inside:

- `app/tsx-runner`

## 4) Active App Wiring

`app/tsx-runner/src/main.tsx` imports:

- `../../NoriApp_2.jsx`

So `NoriApp_2.jsx` is the app currently being served.
