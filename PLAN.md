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
- [x] **Harden auth endpoints.** *(done)* Signup is IP rate-limited (5 / 10 min); login attempts are IP rate-limited in the NextAuth `authorize` callback (10 / 5 min, fails closed). Signup now validates email format and normalizes email (trim + lowercase); login normalizes the same way so lookups match. Password minimum raised from 6 → 8 (server + signup form). Shared limiter lives in `src/lib/rate-limit.ts`.
- [ ] **Rate limiting won't hold on Vercel.** All rate limiters are in-memory — the two AI ones (`api/ai/suggest`, `api/ai/score-description`) plus the new shared `src/lib/rate-limit.ts` now used by signup/login/respond. Serverless instances don't share memory, so the real limit is N× per instance and resets on cold start. Adequate as a speed bump at single-user scale; back the shared helper with a Turso table or Upstash counter before opening signups. (The two AI endpoints still have their own copies — fold them into the shared helper when doing this.)
- [x] **Harden the public respond endpoint.** *(done)* `POST /api/estimates/[id]/respond` now caps `message` at 2000 chars, rate-limits per share-token + IP (5 / 10 min), and locks once the estimate is `approved` (returns 409 — no more responses or status flips). The response-create + status-update are now a single `prisma.$transaction`.
- [ ] **Decide: should customers see `notes`?** The share page and PDF both render the estimate's `notes` field. If notes are used for internal margin/subcontractor remarks, they're leaking to customers. Either split into internal vs. customer-facing notes or document that notes are customer-visible. *(Decision needed — product call.)*

## P2 — Deployment & developer experience

- [x] **Add `.env.example`** documenting `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, and the four optional AI keys. *(Added by the audit PR.)*
- [x] **Remove the dead SQLite dependencies.** *(done)* Dropped `better-sqlite3` and `@prisma/adapter-better-sqlite3` from `package.json` and `better-sqlite3` from `next.config.ts` `serverExternalPackages` — nothing imported them (the app uses the libSQL adapter). Removes a native build from install.
- [x] **Migrate `middleware.ts` → `proxy.ts`.** *(done)* Renamed `src/middleware.ts` → `src/proxy.ts` and `export function middleware` → `export function proxy` (matcher config unchanged). Build's deprecation warning is gone. Verified at runtime against `next start`: protected pages 307 → `/login`, protected APIs `401 {error}`, public routes 200.
- [x] **Add CI.** *(done)* `.github/workflows/ci.yml` runs `npm ci` → `prisma generate` → `tsc --noEmit` → `eslint` → `next build` on PRs and pushes to `main` (dummy `TURSO_DATABASE_URL`/`AUTH_SECRET` since the build contacts no DB).
- [x] **Document/support local dev without Turso.** *(done)* Covered in the README (`TURSO_DATABASE_URL="file:./prisma/dev.db"` + `PRISMA_MIGRATE_LOCAL=1`). The footgun found while testing the seed fix — `PRISMA_MIGRATE_LOCAL=1` hardcoded migrations to `file:./prisma/dev.db` regardless of `TURSO_DATABASE_URL` — is now fixed: `prisma.config.ts` derives the local migrate URL from `TURSO_DATABASE_URL` when it's a `file:` URL (falling back to `prisma/dev.db`), so migrate and runtime always point at the same file.
- [ ] **Verify PDF export on Vercel.** PDFKit needs its `.afm` font files at runtime; `serverExternalPackages: ["pdfkit"]` should handle it, but this is a known deployment gotcha — test `/api/estimates/[id]/pdf` on a real Vercel deploy before relying on it.
- [x] **Triage `npm audit`.** *(done — partial by design)* Non-breaking `npm audit fix` took it from 23 vulnerabilities (13 high) to **6 (1 high)**; the fixes bumped dev/build-tooling deps and Prisma 7.4 → 7.8 (in range; regenerated + rebuilt clean). The remaining 6 all require breaking `--force` changes and are **deliberately deferred**: the Next/postcss ones need a framework bump (`next@16.2.10`, outside the pinned range — do as a separate deliberate upgrade); the rest live in the Prisma **CLI dev tree** (`@prisma/dev` → `@hono/node-server`) whose "fix" would downgrade Prisma 7 → 6.19.3 and break the app. The lone remaining high is dev-only (not shipped to runtime).

## P3 — Code quality

- [x] **Consolidate the totals math.** *(done)* Added `lineItemBreakdown` / `lineItemTotal` / `estimateTotals` / `estimateTotal` (+ `TotalsInput`/`EstimateTotals` types) to `src/lib/estimate-calculations.ts` and replaced all ~9 copy-pasted calcs (the 6 list/detail pages, `EstimateForm`, the PDF route, and the share page) with imports. Behavior-preserving (same unrounded float math); one place to change now, covered by unit tests.
- [ ] **Stop dropping the AI line-item descriptions.** The AI prompt demands a `description` per line item and validation requires it, but `LineItem` has no description column and the form never shows it — the text is generated, paid for, and thrown away. Either add the column + UI (nice for customer-facing PDFs) or remove it from the prompt/validation to save tokens. *(Decision needed.)*
- [x] **Refresh the AI model lineup.** *(done for Anthropic)* Bumped the Anthropic provider `claude-sonnet-4-5-20250929` → `claude-sonnet-5` (like-for-like tier refresh), dropped the now-rejected `temperature`/`top_p`, and set `thinking: { type: "disabled" }` to preserve the fast, cheap structured-JSON behavior. The OpenAI/Groq/Gemini model IDs (`gpt-4o-mini`, etc.) still work and were left as-is — refresh them if/when those providers are actually used. *(If you'd rather the Anthropic feature use Opus for higher-quality estimates, or a cheaper model, it's a one-line change.)*
- [x] **Fix the 2 lint warnings.** Unused `bgColor` (`estimates/DescriptionScore.tsx:57`) and unused `numberPattern` (`lib/description-scoring.ts:18`).
- [x] **Add tests.** *(harness + money-math done)* Added **vitest** (`npm test`, wired into CI) with 12 tests for `estimate-calculations.ts` covering `lineItemBreakdown`/`estimateTotals`/`estimateTotal`, AI rounding, and `validateAndNormalizeLineItems`. Still to add (next test increment): API tests for the ownership checks (the cross-tenant P0 cases) and the share/respond token flow.
- [ ] **Add FK indexes when data grows.** SQLite doesn't auto-index FKs; `Estimate.userId`, `LineItem.estimateId`, `Client.userId`, etc. have none. Irrelevant at current row counts — revisit at a few thousand estimates.
- [x] **PDF rendering edge cases.** *(technical bugs done)* Row height is now the wrapped name height (`heightOfString`) instead of a fixed 16pt, so long item names no longer overlap; a page-break check keeps the totals block from running off the bottom; and the download filename sanitizes `jobName` (`[^a-zA-Z0-9]+ → -`, trimmed, capped, `"estimate"` fallback) so it can't inject into the `Content-Disposition` header. Verified by generating a PDF with a wrapping name and running the sanitizer against injection inputs. **Left:** surfacing the estimate `description` in the PDF is a customer-visibility call — see the `notes` decision below.
- [x] **Rename the package.** *(done)* `package.json` `"name"` is now `real-elite-ai-estimator` (was the scaffolding leftover `web`).

## P4 — UX polish

- [x] Dashboard: added a "Changes" stat card + filter for `changes_requested` estimates (grid now 5-up), so they're no longer only visible under "All".
- [x] Redirect `/login` and `/signup` to the dashboard when already signed in — handled in the proxy (signed-in users on those paths get a redirect to `/`). Verified logged-out access to both pages is unchanged.
- [x] Estimates list: **search + status filter** shipped — a client wrapper (`EstimatesList.tsx`) with live text search (job / customer / address) and status-filter chips with counts. *(Pagination / "show more" still deferred until the list grows past a few hundred — search covers the pain at current scale.)*
- [x] Empty-state for the AI provider dropdown when no keys are configured — the AI Suggest modal now shows a clear "No AI providers configured…" message and disables the Generate button, instead of failing with a generic 500.

---

## Shipped beyond the original backlog (2026-07-26)

Feature work added after the P0–P4 cleanup — all migration-free (no schema change, so production-safe), no new paid services:

- **Insights page (`/insights`)** — win rate, revenue won, open pipeline, average estimate value, a 6-month activity trend, pipeline-by-status bars, and a "needs follow-up" list (sent estimates quiet for 7+ days). Metrics live in `src/lib/insights.ts` with 12 unit tests.
- **Duplicate estimate** — `POST /api/estimates/[id]/duplicate` + a Duplicate button; clones details + line items into a fresh draft for repeat / revised jobs.
- **Branded, professional PDF** — company name / contact / license header, estimate #, date + valid-until (30 days), a terms paragraph, and a customer signature/acceptance block. Company details come from `COMPANY_*` env vars (default: Real Elite Contracting) — no schema change. The customer share page shows the company name too.

Second batch (same day):

- **Estimates list search + status filter** — `EstimatesList.tsx` client wrapper: live search over job / customer / address and status-filter chips with live counts. (Closes the P4 list-search item.)
- **CSV export** — `GET /api/estimates/export` streams an RFC-4180 CSV (one row per estimate, with computed materials / labor / markup / total) for bookkeeping; "Export CSV" button on the list. Builder is `src/lib/csv-export.ts` with 9 unit tests (escaping, totals, empty items).
- **Customer PDF download** — the branded PDF generator was extracted to `src/lib/estimate-pdf.ts` (6 unit tests incl. pagination + filename injection safety) and is now reachable by the customer via `GET /api/share/[token]/pdf` (token-gated, no login) with a "Download PDF" button on the share page.
- **Email to customer** — an "Email to Customer" button on a shared estimate opens the contractor's mail client with a pre-filled subject/body and the share link (recipient auto-filled from the linked client's email). Zero-config `mailto:` — no email provider or API key. Builder is `src/lib/estimate-email.ts` with 8 unit tests (subject/body/recipient, `%20` encoding). Delivers a no-dependency slice of the roadmap's v1.0 "email the share link".

This delivers the roadmap's "PDF branding" (v1.0) and "Duplicate an estimate" (v1.1) early, plus the Insights dashboard, list search, CSV export, and mailto delivery (all new). Test suite is now 47 tests.

## Product roadmap (proposed — not yet committed)

The audit backlog above is about making what exists solid. These are the next *features*, in suggested order, sized for a solo operator:

**v1.0 — "Send it" (get estimates in front of customers without leaving the app)**
- Email the share link to the client directly. *(A zero-config `mailto:` version shipped — see "Shipped beyond" above. A fully integrated send via a provider like Resend with a branded template + delivery tracking is still open.)*
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
