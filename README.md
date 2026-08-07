# DKC Packing — Frontend

Next.js 16 + React 19 + Tailwind v4. The screens.

The API is a separate repo: `HardgoodsAndDisplayBackend`.
**Start that one first**, or every screen shows "Could not reach the API".

## Run it

```bash
# terminal 1 — in HardgoodsAndDisplayBackend
docker compose up -d

# terminal 2 — here
docker compose up -d
```

Open http://localhost:3000

Stop with `docker compose down`.

## Everyday commands

```bash
docker compose logs -f frontend    # watch for compile errors
docker compose restart frontend    # REQUIRED after adding a new page file
npm run lint                       # must pass before committing
npm run typecheck                  # must pass before committing
```

**Adding a new page file needs a restart.** Turbopack does not notice new files
across the Windows bind mount. Editing an existing file hot-reloads normally.

## What is where

| Path | What it holds |
|---|---|
| `src/app/(app)/` | One folder per screen. `(app)` wraps them in the sidebar shell. |
| `src/components/ui/` | Buttons, inputs, tables, dialogs — the small reusable pieces |
| `src/lib/api.ts` | The only place this app calls `fetch` |
| `src/lib/queries.ts` | Every data-loading hook |
| `src/lib/calc.ts` | Mirror of the backend's maths, for live form feedback |
| `src/lib/packing.ts` | Mirror of reconciliation and blocker rules |
| `src/types/index.ts` | The shapes the API sends, field for field |

The mirrors in `calc.ts` and `packing.ts` exist so a form can answer instantly
while someone types. **The server re-runs both on save and wins.**
