# AI Career Coach

A Next.js application that helps users accelerate their careers with AI-powered insights, resume assistance, interview preparation, and cover letter generation.

## Features

- **Authentication & Access Control**
  - Clerk authentication with route protection via middleware.
  - Auto user provisioning in the app DB on first visit.

- **Onboarding**
  - Collects industry, experience, skills, and bio.
  - Ensures an `IndustryInsight` record exists (AI-generated if missing).

- **Dashboard: Industry Insights**
  - Salary ranges by role, growth rate, demand level.
  - Top skills, market trends, recommended skills.
  - Falls back to default dataset if AI is unavailable.

- **Resume Builder**
  - Rich editor with persistent storage.
  - AI-powered improvement for resume sections.
  - PDF export via `html2pdf.js`.

- **Interview Preparation**
  - AI-generated 10-question MCQ quiz tailored to user profile.
  - Stores detailed results and renders performance charts.
  - Generates concise improvement tips for missed questions.
  - Deterministic local fallback quiz if AI is unavailable.

- **AI Cover Letters**
  - Generates tailored markdown cover letters based on user profile and job details.
  - Lists, views, and deletes stored letters.
  - Templated fallback letter if AI is unavailable.

- **Theming & UI**
  - TailwindCSS with dark mode (next-themes).
  - Accessible UI components built on Radix primitives.
  - Toast notifications with Sonner.

- **Background Jobs (Inngest)**
  - Inngest endpoint wired for background/scheduled AI tasks.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components, Middleware)
- **Language**: JavaScript, React 19
- **Auth**: Clerk (`@clerk/nextjs`)
- **DB/ORM**: PostgreSQL + Prisma
- **AI**: Google Gemini (`@google/generative-ai`)
- **Jobs**: Inngest (`inngest`)
- **UI**: TailwindCSS, Radix UI, shadcn-style components, lucide-react
- **Forms/Validation**: react-hook-form, zod
- **Charts/UX**: recharts, react-spinners, react-markdown, html2pdf.js

## Project Structure

```
app/
  (auth)/...
  (main)/
    ai-cover-letter/...
    dashboard/...
    interview/...
    onboarding/...
    resume/...
  api/inngest/route.js
  layout.js
  page.js
components/
  header.jsx
  hero.jsx
  ui/* (Radix wrappers)
lib/
  prisma.js
  checkUser.js
  utils.js
  inngest/
    client.js
    function.js
prisma/
  schema.prisma
middleware.js
next.config.mjs
tailwind.config.mjs
postcss.config.mjs
package.json
```

## Data Model (Prisma)

- **User**: `clerkUserId`, `email`, `name`, `imageUrl`, `industry`, `experience`, `skills[]`, `bio`
- **Assessment**: quiz attempts with per-question details and optional `improvementTip`
- **Resume**: one per user; `content`, optional `atsScore`, `feedback`
- **CoverLetter**: many per user; `content`, `jobDescription`, `companyName`, `jobTitle`, `status`
- **IndustryInsight**: unique per `industry` with salaries, skills, trends, outlook; referenced by users via `industry`

See `prisma/schema.prisma` for details.

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Google Generative AI (Gemini)
GEMINI_API_KEY="your_gemini_api_key"

# Optional: Inngest (if using CLI or cloud, follow their docs)
# INNGEST_EVENT_KEY="..."
```

Notes:
- If `GEMINI_API_KEY` is not set, AI features use safe fallbacks (insights dataset, quiz pool, templated cover letter). `Resume improve` requires the key and will error without it.

## Prerequisites

- Node.js 18+ (recommended for Next.js 15 and React 19)
- PostgreSQL database
- Prisma CLI (installed via devDependencies)
- Clerk account and app keys
- Optional: Inngest account/CLI for scheduled jobs

## Setup

- **Install dependencies**
  ```bash
  npm install
  ```

- **Generate Prisma Client**
  ```bash
  npx prisma generate
  ```

- **Run DB migrations (initialize schema)**
  ```bash
  npx prisma migrate dev --name init
  ```
  Alternatively, if you already have a DB schema, `prisma db push` can be used.

- **Development**
  ```bash
  npm run dev
  ```
  App runs with Turbopack at http://localhost:3000

- **Build & Start**
  ```bash
  npm run build
  npm start
  ```

## Scripts

- **dev**: `next dev --turbopack`
- **build**: `next build`
- **start**: `next start`
- **lint**: `next lint`
- **postinstall**: `prisma generate`

## Implementation Details

- **Auth protection**: `middleware.js` redirects unauthenticated users away from protected routes (`/dashboard`, `/resume`, `/interview`, `/ai-cover-letter`, `/onboarding`).
- **Server Actions**: Located in `actions/` and begin with `"use server"`. All actions validate Clerk auth.
- **Prisma Client reuse**: `lib/prisma.js` uses a global client in dev to avoid connection storms.
- **AI fallbacks**: Dashboard, Interview, and Cover Letters gracefully degrade without `GEMINI_API_KEY`.
- **Inngest**: `app/api/inngest/route.js` exposes event handlers; `lib/inngest/function.js` contains job logic.

## Deployment

- Ensure all environment variables are configured in your host (Vercel, Netlify, etc.).
- Provide a managed Postgres instance and set `DATABASE_URL` and `DIRECT_URL`.
- Run Prisma migrations as part of your deployment pipeline.
- Configure Clerk keys for the deployment domain.
- Set `GEMINI_API_KEY` for full AI functionality.

## License

This project’s license is not specified in the repository. Add a LICENSE file if required.
