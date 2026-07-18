# Real Elite AI Estimator — Project Plan

> Last updated: 2026-07-18 (full project audit). This is the living plan for the app.
> Check items off as they land; add new items at the bottom of the relevant section.

## Where the project stands

**Built and working** (verified by audit — typecheck, lint, and production build all pass):

- **Auth** — email/password signup + login (NextAuth v5 credentials, bcrypt, JWT sessions), route protection via middleware, per-user data isolation on every API route.
- **Estimates** — full CRUD with line items (qty, unit cost, labor hours/rate, markup %), live totals, status flow (`draft → sent → approved / changes_requested`).
- **AI assist** — description-first estimate flow with a quality score + tips, and "AI Suggest" that generates 4–8 validated line items via any configured provider (Anthropic, OpenAI, Groq, Gemini). Server-side validation, one automatic retry, per-user rate limiting, totals recomputed server-side.
- **Clients & Projects** — CRUD, linking estimates to both, per-client/per-project totals.
- **Customer portal** — tokenized public share links, customer approve / request-changes with message, response history, revocable links.
- **PDF export** — customer-friendly PDF via PDFKit.
- **Dashboard** — stats cards (all/draft/sent/approved) with filtering and quick actions.
- **Hosting posture** — Turso (hosted libSQL) via Prisma 7 driver adapter, aimed at Vercel.

**No plan existed before this audit** — no plan file, no GitHub issues, no TODOs in code. This document is now the plan.

---

## P0 — Correctness & data safety (do these first)

> **Update 2026-07-18:** All P0 items + the P1 401 fix + the P3 lint warnings are done on branch `claude/project-audit-plan-bq53oi` (verified: tsc, eslint, fresh-clone `next build`, and seed guard/happy-path all exercised).

- [x] **Make the repo's build script self-contained.** `npm run build` is just `next build`, but the Prisma client output (`src/generated/prisma`) is gitignored and Prisma 7 no longer auto-generates on install — a fresh clone fails to build (verified in audit). Vercel deploys succeed *today* only because the Vercel project has a dashboard build-command override, `npx prisma generate && next build` (confirmed in the PR #1 preview-deploy logs). Move that into `package.json` (`"build": "prisma generate && next build"`) so local builds, CI, and any new environment work without hidden dashboard config.
- [x] **Make estimate updates transactional.** `PUT /api/estimates/[id]` (`src/app/api/estimates/[id]/route.ts:43`) does `lineItem.deleteMany()` and then a separate `estimate.update()` with nested creates. If the update fails (bad `clientId`, network blip to Turso), the estimate's line items are already gone. Wrap both in `prisma.$transaction`.
- [x] **Validate `clientId` / `projectId` ownership.** `POST /api/estimates` and `PUT /api/estimates/[id]` accept any `clientId`/`projectId` without checking the client/project belongs to the requesting user. A crafted request can attach an estimate to another user's client, and that estimate (with totals) then renders on the other user's client detail page. Verify ownership before linking; reject with 400 otherwise.
- [x] **Fix the seed script.** Three problems in `prisma/seed.mts` / `package.json`:
  - `package.json` has a legacy `"prisma": { "seed": "npx tsx prisma/seed.ts" }` pointing at a file that doesn't exist (real file is `seed.mts`; `prisma.config.ts` has the correct path). Remove the stale block.
  - The seed deletes users but not clients/projects — the `Client.userId`/`Project.userId` FKs are `Restrict`, so `user.deleteMany()` throws once any client or project exists.
  - The seed wipes **all** data unconditionally and runs against whatever `TURSO_DATABASE_URL` points to — i.e. production. Add a guard (refuse unless the URL is a `file:` URL or an explicit `SEED_FORCE=1` is set).

## P1 — Security hardening

- [x] **Return 401 JSON for unauthenticated API calls.** `src/middleware.ts` redirects everything to `/login` (302), so client `fetch()` calls get an HTML page instead of an error. For `pathname.startsWith("/api")`, return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`. (API routes do re-check auth themselves, so this is robustness, not a hole.)
- [ ] **Harden auth endpoints.** No rate limiting on `/api/auth/signup` or the NextAuth login callback (credential stuffing), no email format validation on signup, password minimum is 6 chars. Add basic validation + a rate limit.
- [ ] **Rate limiting won't hold on Vercel.** Both AI rate limiters are in-memory `Map`s (`api/ai/suggest`, `api/ai/score-description`) — serverless instances don't share memory, so the real limit is N× per instance and resets on cold start. Fine for now at single-user scale; swap for a Turso-backed or Upstash counter before opening signups.
- [ ] **Harden the public respond endpoint.** `POST /api/estimates/[id]/respond` allows unlimited responses and unbounded `message` length, and can flip status back and forth until approval. Cap message length (~2000 chars), and consider locking after approval.
- [ ] **Decide: should customers see `notes`?** The share page and PDF both render the estimate's `notes` field. If notes are used for internal margin/subcontractor remarks, they're leaking to customers. Either split into internal vs. customer-facing notes or document that notes are customer-visible. *(Decision needed — product call.)*

## P2 — Deployment & developer experience

- [ ] **Add `.env.example`** documenting `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, and the four optional AI keys. *(Added by this audit PR.)*
- [ ] **Remove the dead SQLite dependencies.** `better-sqlite3` and `@prisma/adapter-better-sqlite3` are still in `package.json` (and `better-sqlite3` in `next.config.ts` `serverExternalPackages`) from before the Turso switch. `better-sqlite3` is a native build — it slows installs and can break Vercel builds for zero benefit.
- [ ] **Migrate `middleware.ts` → `proxy.ts`.** Next.js 16 flags the `middleware` file convention as deprecated during build ("Please use `proxy` instead"). Small rename + API tweak, best done before Next 17 removes it.
- [ ] **Add CI.** No tests or CI exist. Minimum viable: a GitHub Action running `prisma generate`, `tsc --noEmit`, `eslint`, `next build` on PRs.
- [ ] **Document/support local dev without Turso.** `src/lib/prisma.ts` requires `TURSO_DATABASE_URL`; the libSQL adapter accepts `file:` URLs, so local dev is `TURSO_DATABASE_URL="file:./prisma/dev.db"` plus `PRISMA_MIGRATE_LOCAL=1` for migrations (that switch already exists in `prisma.config.ts`). Now covered in the README — keep it working. **Footgun (found while testing the seed fix):** `PRISMA_MIGRATE_LOCAL=1` hardcodes migrations to `file:./prisma/dev.db` regardless of `TURSO_DATABASE_URL`, while the app and seed read `TURSO_DATABASE_URL` — so for a working local loop the two must both be `file:./prisma/dev.db`. Consider having `prisma.config.ts` derive the local migrate URL from `TURSO_DATABASE_URL` instead of hardcoding.
- [ ] **Verify PDF export on Vercel.** PDFKit needs its `.afm` font files at runtime; `serverExternalPackages: ["pdfkit"]` should handle it, but this is a known deployment gotcha — test `/api/estimates/[id]/pdf` on a real Vercel deploy before relying on it.
- [ ] **Triage `npm audit`.** The Vercel build reports 23 vulnerabilities (2 low, 8 moderate, 13 high). Likely mostly transitive; run `npm audit`, upgrade what's real, document what's accepted.

## P3 — Code quality

- [ ] **Consolidate the totals math.** The identical materials/labor/markup calculation is copy-pasted in **8 places**: `src/app/page.tsx`, `estimates/page.tsx`, `clients/page.tsx`, `clients/[id]/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`, `estimates/EstimateForm.tsx`, `api/estimates/[id]/pdf/route.ts`, plus `share/[token]/page.tsx` — while `src/lib/estimate-calculations.ts` (used only by AI suggest) already has the canonical version. One rounding tweak would currently need 9 edits. Export `calcEstimateTotal`/`calcTotals` from the lib and import everywhere.
- [ ] **Stop dropping the AI line-item descriptions.** The AI prompt demands a `description` per line item and validation requires it, but `LineItem` has no description column and the form never shows it — the text is generated, paid for, and thrown away. Either add the column + UI (nice for customer-facing PDFs) or remove it from the prompt/validation to save tokens. *(Decision needed.)*
- [ ] **Refresh the AI model lineup.** `src/lib/ai-providers.ts` pins `claude-sonnet-4-5-20250929` (legacy; current Anthropic flagship is `claude-opus-4-8`) and `gpt-4o-mini` (dated). Note: Anthropic models newer than 4.5 **reject** the `temperature`/`top_p` params the code currently sends — upgrading the model requires dropping those params in the Anthropic call path.
- [x] **Fix the 2 lint warnings.** Unused `bgColor` (`estimates/DescriptionScore.tsx:57`) and unused `numberPattern` (`lib/description-scoring.ts:18`).
- [ ] **Add tests.** Priority order: unit tests for `estimate-calculations.ts` (money math), API tests for ownership checks (the cross-tenant cases in P0), and the share/respond token flow.
- [ ] **Add FK indexes when data grows.** SQLite doesn't auto-index FKs; `Estimate.userId`, `LineItem.estimateId`, `Client.userId`, etc. have none. Irrelevant at current row counts — revisit at a few thousand estimates.
- [ ] **PDF rendering edge cases.** Long item names overlap the next row (fixed 16pt row height with wrapped text), the totals block has no page-break check (can run off-page after ~35 items), and the download filename interpolates `jobName` unsanitized into the `Content-Disposition` header. The project `description` also never appears in the PDF.
- [ ] **Rename the package.** `package.json` `"name": "web"` is a leftover from scaffolding.

## P4 — UX polish

- [ ] Dashboard: `changes_requested` estimates have no stat card (only visible under "All").
- [ ] Redirect `/login` and `/signup` to the dashboard when already signed in.
- [ ] Estimates list: search + pagination once the list grows past ~50.
- [ ] Empty-state for the AI provider dropdown when no keys are configured (currently a generic 500 message).

---

## Product roadmap (proposed — not yet committed)

The audit backlog above is about making what exists solid. These are the next *features*, in suggested order, sized for a solo operator:

**v1.0 — "Send it" (get estimates in front of customers without leaving the app)**
- Email the share link to the client directly (e.g. Resend) with a branded template; auto-set status to `sent`.
- PDF branding: Real Elite Contracting logo, license #, phone/email, payment terms, and a signature line.
- Notify Jose (email) when a customer approves or requests changes — right now responses are only visible by opening the estimate.

**v1.1 — Faster quoting**
- Price book / cost catalog: save frequently used line items (shingle tear-off, deck framing, LVP install…) and insert them with one click; let AI Suggest draw from the catalog for pricing consistency.
- Duplicate an estimate (repeat jobs, revision quotes).
- Job photos on estimates (before/scope shots), stored in object storage.

**v1.2 — Close the loop on money**
- Customer e-signature at approval (signed name + timestamp stored on the response).
- Deposit collection / invoicing (Stripe) and estimate → invoice conversion.

**Later**
- Multi-user (crew leads with limited roles), QuickBooks export, mobile PWA install experience.

---

## Open decisions (need Jose's call)

1. **Customer visibility of `notes`** — split internal vs. customer-facing, or keep as-is? (P1)
2. **AI line-item descriptions** — persist and show them (richer PDFs) or drop them (cheaper tokens)? (P3)
3. **Which AI providers matter?** Four are wired; each needs its own key. Trim to the one or two actually used, or keep all as fallbacks.
4. **Roadmap order** — v1.0 as proposed, or is the price book (v1.1) more urgent for day-to-day quoting?

## Audit verification snapshot (2026-07-18)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `eslint` | ✅ 2 warnings (unused vars), 0 errors |
| `next build` (after `prisma generate`) | ✅ all 24 routes compile |
| `next build` on fresh clone (no generate) | ✅ now passes — build script runs `prisma generate` (P0 fixed) |
| Vercel preview deploy (PR #1) | ✅ succeeds — dashboard build-command override runs `prisma generate` (see P0) |
| Seed guard (remote/unset URL) | ✅ refuses before any DB write |
| Seed happy path + re-seed | ✅ FK-safe delete order, runs clean twice |
| Prisma schema ↔ migrations | ✅ in sync (2 migrations) |
| Secrets in repo | ✅ none (`.env*` gitignored) |
| Per-user authorization on API routes | ✅ consistent ownership checks (except the P0 clientId/projectId gap) |
| Share tokens | ✅ 128-bit `crypto.randomBytes`, unique, revocable |
