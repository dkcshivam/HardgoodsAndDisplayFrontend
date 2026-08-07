# DKC Packing — Frontend

Next.js 16 app for turning an order into a verified carton plan.

The API lives in a separate repo, `HardgoodsAndDisplayBackend`, alongside
`ARCHITECTURE.md` — the full spec for the domain, data model and endpoints.
Read it there when behaviour is in question. **Start the backend first**; this
app is useless without it.

## Commands

```bash
docker compose up -d          # needs the backend already running on :8000
npm run lint                  # must pass
npm run typecheck             # must pass
```

http://localhost:3000

**Adding a route file needs `docker compose restart frontend`** — Turbopack does
not see new files across the Windows bind mount. Edits to existing files
hot-reload normally.

## Layout

```
src/app            routes; (app)/ carries the shell (sidebar, topbar)
src/components/ui  primitives — button, input, table, dialog, toast
src/components     everything else we wrote
src/lib/api.ts     the single fetch wrapper
src/lib/queries.ts every React Query hook
src/lib/calc.ts    mirror of the backend's calc.py
src/lib/packing.ts mirror of reconcile() and find_blockers()
src/types          mirrors DRF output exactly
```

## Rules

- **snake_case in TypeScript.** Types mirror DRF output; there is no mapping
  layer, on purpose.
- **Units**: inches, kilograms, CBM. Every field carries its unit as a suffix.
- **The backend owns decisions; we mirror only calculations.** `calc.ts` and
  `packing.ts` exist so a form can answer instantly while someone types. The
  server re-runs both on save and wins. Never let a client-side check be the
  only thing standing between bad data and the database.
- All HTTP goes through `lib/api.ts`. Never call `fetch` from a component.
- Server state goes through React Query. No `useEffect` fetching.
- Derived values (`net_weight_kg`, `gross_weight_kg`, `cbm`) are read-only —
  never send them back to the API.

## Style

Comments explain *why*, not *what*. No file-header block comments. One or two
lines is the budget for a non-obvious decision.

## Git

Small commits, one feature each. A single imperative line under ~60 characters,
plain English, no trailers, no attribution footers, no emoji.

```
add box types list screen
fix cbm rounding on carton totals
```
