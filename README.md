# Real Elite AI Estimator

AI-assisted construction estimating for Real Elite Contracting — describe the job, get a priced line-item breakdown, share it with the customer, and track approval.

Built with Next.js 16 (App Router), Prisma 7 + Turso (libSQL), NextAuth v5, Tailwind CSS v4, and PDFKit.

> **Project status & backlog:** see [PLAN.md](./PLAN.md).

## Features

- **Accounts** — email/password signup and login; every user sees only their own data.
- **Description-first estimates** — write the job description, get a live quality score with tips (heuristic + AI), then build the estimate.
- **AI Suggest** — generates 4–8 realistic line items (materials, labor hours/rates, markup) from the description using your choice of provider: Anthropic, OpenAI, Groq, or Gemini. Output is strictly validated and totals are recomputed server-side.
- **Estimate builder** — add/edit/delete line items with live materials, labor, markup, and grand totals.
- **Clients & Projects** — manage clients and projects, link estimates to them, see per-client totals.
- **Customer portal** — generate a tokenized share link; the customer can approve or request changes (with a message) without an account. Links are revocable.
- **Status tracking** — `draft → sent → approved / changes_requested`, with a filterable stats dashboard.
- **Insights dashboard** — win rate, revenue won, open pipeline, average job size, a 6-month activity trend, and a follow-up list for estimates that have gone quiet.
- **Duplicate estimates** — one-click clone for repeat customers and revised quotes.
- **Branded PDF export** — professional, downloadable PDF per estimate with your company header, license #, validity date, terms, and a customer signature/acceptance block (configured via `COMPANY_*` env vars). Customers can download it themselves right from the share link.
- **Search & filter** — live search (job, customer, address) and status filter on the estimates list.
- **CSV export** — download all estimates as a spreadsheet-ready CSV for bookkeeping/accounting.
- **Email to customer** — one click opens your mail app with a pre-filled message and the share link (recipient auto-filled from the linked client). No email service or API key required.
- **Dashboard action center** — the home page surfaces estimates that have gone quiet (need follow-up) and your latest customer responses, so approvals and stalled quotes are visible at a glance instead of buried inside each estimate.
- **Manual status control** — set an estimate's status yourself (draft / sent / approved / changes requested), e.g. to record a phone approval, so the win-rate and follow-up metrics stay accurate.

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env   # then fill in values (see table below)

# Generate the Prisma client (required — output is gitignored)
npx prisma generate

# Apply migrations
# Local file database:
PRISMA_MIGRATE_LOCAL=1 npx prisma migrate dev
# Hosted Turso database (uses TURSO_* from .env):
npx prisma migrate deploy

# (Optional) seed demo data — WARNING: wipes existing data in the target DB
npx prisma db seed

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | ✅ | libSQL URL. Turso: `libsql://<db>.turso.io`. Local dev: `file:./prisma/dev.db` |
| `TURSO_AUTH_TOKEN` | For Turso | Auth token for the hosted database (not needed for `file:` URLs) |
| `AUTH_SECRET` | ✅ | NextAuth JWT secret — generate with `npx auth secret` or `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | optional | Enables the Claude provider for AI Suggest |
| `OPENAI_API_KEY` | optional | Enables the GPT provider |
| `GROQ_API_KEY` | optional | Enables the Llama (Groq) provider |
| `GEMINI_API_KEY` | optional | Enables the Gemini provider |
| `COMPANY_NAME` | optional | Business name on the estimate PDF and customer share page (default: `Real Elite Contracting`) |
| `COMPANY_PHONE` / `COMPANY_EMAIL` / `COMPANY_LICENSE` / `COMPANY_ADDRESS` / `COMPANY_WEBSITE` | optional | Contact/license details shown on the branded PDF and share page |

At least one AI key is needed for AI Suggest and AI description tips; the rest of the app works without any. The `COMPANY_*` vars brand the customer-facing PDF and share page.

## Project structure

```
prisma/
├── schema.prisma            # User, Estimate, LineItem, Client, Project, CustomerResponse
├── migrations/              # SQL migrations
└── seed.mts                 # Demo data seed (destructive — see PLAN.md)
src/
├── proxy.ts                 # Auth gate for app + API routes (Next 16 proxy)
├── lib/
│   ├── prisma.ts            # Prisma client (libSQL adapter)
│   ├── auth.ts              # NextAuth v5 config (credentials provider)
│   ├── auth-helpers.ts      # getAuthUser() + relation-ownership checks
│   ├── ai-providers.ts      # Provider registry (Anthropic/OpenAI/Groq/Gemini)
│   ├── estimate-calculations.ts  # Line-item validation + shared totals math
│   ├── description-scoring.ts    # Heuristic description quality score
│   ├── insights.ts          # Business metrics for the Insights page
│   ├── company.ts           # Company profile (env-driven) for PDF + share
│   ├── estimate-pdf.ts      # Branded PDF generator (owner + customer routes)
│   ├── estimate-email.ts    # Pre-filled mailto builder (send share link)
│   ├── estimate-status.ts   # Estimate status constants + validation
│   ├── csv-export.ts        # Estimates → CSV for bookkeeping export
│   └── rate-limit.ts        # Shared in-memory rate limiter
└── app/
    ├── page.tsx / Dashboard.tsx  # Stats dashboard (or landing page when signed out)
    ├── login/ · signup/          # Auth pages
    ├── estimates/                # List (search/filter), new (description-first flow), edit, form
    ├── clients/ · projects/      # CRUD pages
    ├── insights/                 # Business insights dashboard
    ├── share/[token]/            # Public customer portal page
    └── api/
        ├── auth/                 # NextAuth handlers + signup
        ├── estimates/            # CRUD + /pdf + /share + /respond + /duplicate + /export + /status
        ├── share/[token]/pdf     # Public (token-gated) customer PDF download
        ├── clients/ · projects/  # CRUD
        └── ai/                   # providers, suggest, score-description
```

## Line item fields

Each line item: **name**, **unit** (`ea, sqft, lnft, job, hr, ton, gal`), **qty**, **unit cost** (materials), **labor hours**, **labor rate**, **markup %**. Line total = (qty × unit cost + hours × rate) × (1 + markup).

## Deployment notes (Vercel + Turso)

- Set all required env vars in Vercel.
- The build must run `prisma generate` before `next build`. The Vercel project currently does this via a dashboard build-command override (`npx prisma generate && next build`); PLAN.md P0 proposes moving it into `package.json` so builds work everywhere, not just on Vercel.
- Migrations are applied against Turso with `npx prisma migrate deploy` (locally or in CI), not during the Vercel build.
