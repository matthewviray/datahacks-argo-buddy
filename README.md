# Argo Buddy Project

This repository contains:

- Argo profile data workflows in Jupyter notebooks.
- A React/TSX UI prototype in `app/argobuddy-app.tsx`.
- Organized raw and processed data folders.

## Project Structure

```text
datahacks-argo-buddy/
├─ app/
│  ├─ argobuddy-app.tsx
│  └─ tsx-runner/              # Vite runner used to mount and run argobuddy-app.tsx
├─ data/
│  ├─ raw/
│  │  ├─ 3901161_1386_EasyTSLite.csv
│  │  └─ profiles/
│  │     └─ 3901161/
│  └─ processed/
│     └─ single_argo.csv
├─ docs/
│  └─ 3901161_1386_EasyTSLite.md
├─ data.ipynb
├─ historical_baseline.ipynb
├─ refined_mood_engine.ipynb
├─ EDA.ipynb
└─ tsconfig.json
```

## Run The TSX App

The UI component lives in `app/argobuddy-app.tsx` and is run through the Vite project in `app/tsx-runner`.

1. Install dependencies:

```bash
cd app/tsx-runner
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the local URL shown in terminal (usually `http://localhost:5173/`).

4. Optional production build check:

```bash
npm run build
```

## Data Notebook Workflow (`data.ipynb`)

`data.ipynb` now follows a generic workflow without hardcoding a specific profile id in code:

1. Explain Argo CSV structure:
	 - metadata comment block (`# ...`)
	 - clean tabular section (header + rows)
2. Parse metadata from comment lines.
3. Read the table cleanly with `pd.read_csv(..., comment='#')`.
4. Add metadata back as `meta_*` columns.
5. Combine platform profile CSVs from `data/raw/profiles/`.
6. Write clean output to `data/processed/single_argo.csv`.

## Notes

- If VS Code shows stale TypeScript diagnostics, run:
	- `TypeScript: Restart TS Server`
	- `Developer: Reload Window`
- Root `tsconfig.json` is configured to resolve types from `app/tsx-runner/node_modules`.