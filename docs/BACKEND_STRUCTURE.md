# Zenith Backend Structure

The Cloudflare Worker backend is intentionally being split into small, focused modules while preserving the existing route behavior.

## Current Layout

```txt
api/src/
  index.ts                 # Hono app wiring and route handlers
  types.ts                 # Worker bindings and shared API types
  crypto.ts                # Password hashing helpers
  domain/                  # Pure domain rules, rankings, scoring rules
  middleware/              # Request-level auth, admin auth, rate limiting
  repositories/            # Database access helpers
  routes/                  # Hono route modules mounted by index.ts
  schemas/                 # Zod request contracts
  services/                # Business logic that is not tied to Hono
```

## Direction

New backend code should avoid adding more shared logic directly to `index.ts`.

- Put reusable validation in `schemas/`.
- Put JWT/admin/rate-limit request concerns in `middleware/`.
- Put SQL helpers in `repositories/`.
- Put business rules and calculations in `services/` or `domain/`.
- Keep route handlers focused on request parsing, calling services, and returning responses.

## Next Refactor Targets

The next high-value split is route registration:

```txt
routes/
  auth.ts
  friends.ts
  groups.ts
  leaderboard.ts
```

Each route module should export a Hono sub-app or a registration function. That will make endpoint ownership clearer and will make backend tests easier to add without booting the whole API surface.

`admin.ts`, `beta.ts`, `sync.ts`, and `users.ts` have already started this split. Continue moving routes by bounded domain, keeping behavior unchanged and running the API typecheck after each extraction.
