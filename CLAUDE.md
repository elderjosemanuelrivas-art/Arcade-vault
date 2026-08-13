# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version is non-standard

This project pins `next@16.3.0`, which post-dates your training data and has breaking API/convention changes from the Next.js you know. **Before writing or editing any Next.js code** (routing, data fetching, config, metadata, layouts, etc.), read the relevant page under `node_modules/next/dist/docs/` — it's organized as:

- `01-app/01-getting-started`, `02-guides`, `03-api-reference` — App Router (used by this project)
- `02-pages/` — Pages Router (not used here)
- `03-architecture/` — compiler, fast refresh, accessibility, browser support
- `04-community/`

Do not assume App Router behavior (routing conventions, `layout.tsx` types, config options, etc.) matches what you already know without checking the docs first.

## Commands

- `npm run dev` — start the dev server (also regenerates the AGENTS.md agent-rules block on every run; commit it if it shows as a diff)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, using `eslint-config-next`'s `core-web-vitals` + `typescript` rule sets)

There is no test runner configured yet.

## Architecture

- App Router project (`app/` directory), TypeScript in strict mode, path alias `@/*` → project root.
- Styling via Tailwind CSS v4 (`@tailwindcss/postcss`), configured through `app/globals.css` rather than a `tailwind.config.js`.
- `app/layout.tsx` is the root layout; note the `LayoutProps<"/">` typed props pattern used there — a Next.js 16 App Router convention, not the plain `{ children: React.ReactNode }` signature from older versions.
- The codebase is currently the unmodified `create-next-app` scaffold (`app/page.tsx` is boilerplate) — no domain-specific modules, API routes, or data layer exist yet.

## Intended workflow: Spec Driven Design

Per `README.md`, this project is meant to follow a spec-driven workflow using `/spec` and `/spec-impl`, based on the practices at https://github.com/Klerith/fernando-skills, installable via:

```bash
npx skills@latest add Klerith/fernando-skills
```

These skills/commands are not yet installed in this repo (no `.claude/` directory present). If asked to implement a feature and this workflow is set up later, prefer writing a spec first rather than jumping straight to implementation.
