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
- `npm run format` — Prettier (`.prettierrc.json`, with `prettier-plugin-tailwindcss`), writing every file except what's listed in `.prettierignore` (`referencias/`, `app/globals.css` — hand-ported 1:1 from the mockup, don't reformat it — `node_modules/`, build output)

There is no test runner configured yet.

A project-scoped `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/format-and-lint.mjs`) runs Prettier and `eslint --fix` automatically on every file Claude writes or edits, respecting the same `.prettierignore` exclusions. Any lint problems `--fix` can't resolve are surfaced back into context instead of failing silently.

`.mcp.json` declares a project-scoped `supabase` MCP server (HTTP, docs/account/database/debugging/development/functions/branching features), enabled per-user via `enabledMcpjsonServers` in `.claude/settings.local.json`. The app does not use Supabase yet — there's no Supabase dependency in `package.json`, `data/games.ts` is still mock data, and `app/api/contacto/route.ts` is still the only Route Handler. Treat the MCP server as a docs/DB-exploration tool, not a sign that a backend exists.

The contact form (`/acerca`) needs a `.env.local` with `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` (see `.env.example`) or `POST /api/contacto` returns `500 { error: "server" }`. Without a verified domain in Resend, `CONTACT_TO` must be the email address the Resend account itself was created with — any other recipient is rejected by Resend.

## Architecture

- App Router project (`app/` directory), TypeScript in strict mode, path alias `@/*` → project root.
- Styling via Tailwind CSS v4 (`@tailwindcss/postcss`), configured through `app/globals.css` rather than a `tailwind.config.js`. `globals.css` also carries a hand-authored retro "Arcade Vault" theme (CSS custom properties, semantic classes like `.card`, `.btn`, `.crt`) ported 1:1 from `referencias/templates/styles.css` — reuse those classes, don't invent Tailwind utility equivalents for screens that already have one.
- `app/layout.tsx` is the root layout; note the `LayoutProps<"/">` typed props pattern used there — a Next.js 16 App Router convention, not the plain `{ children: React.ReactNode }` signature from older versions. It wraps every page in `SessionProvider` → `Nav` → `<main className="av-main">{children}</main>` → `SiteFooter`.
- `app/fonts.ts` — `next/font/google` loaders (`pressStart2P`, `courierPrime`, `jetBrainsMono`), exposed as CSS variables and consumed by `globals.css`.
- Real routes: `/` (Landing), `/biblioteca` (Biblioteca), `/acerca` (Acerca de / Contacto), `/juegos/[id]` (Detalle), `/juegos/[id]/jugar` (Reproductor), `/auth` (Acceso), `/salon` (Salón de la Fama). Dynamic pages use the `PageProps<'/juegos/[id]'>` global helper with `await params` (see the Next.js version note above).
- `app/api/contacto/route.ts` — the project's only Route Handler (`POST`). Validates with `lib/contact.ts`, applies an in-memory honeypot + per-IP rate limit, then sends the message via Resend. Reads `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` from `.env.local` (see `.env.example` for the shape) — the only place in the repo that touches `process.env`.
- `lib/contact.ts` — shared contact-form validation (`validateContact`), used by both the client form and the route handler above.
- `data/games.ts` — typed mock data (`GAMES`, `CATS`, `seededScores`, `HOME_TICKER`, `HOME_TOP`, `HOME_STATS`). No database.
- `app/components/` — one component per screen (`home.tsx`, `library.tsx`, `game-card.tsx`, `leaderboard.tsx`, `game-player.tsx`, `auth-form.tsx`, `hall-of-fame.tsx`, `about-contact.tsx`), plus `nav.tsx`, `site-footer.tsx`, `session-provider.tsx`, `pixel-icons.tsx` (shared inline SVG icons) and `use-reveal.ts` (shared scroll-reveal `IntersectionObserver` hook).
- `app/components/session-provider.tsx` implements a **fake client-side session** (no real auth/backend): `useSession()` exposes `user`, `signIn`, `signOut`, `saveScore`, persisted in `localStorage` (`av_user`, `av_scores`).
- `app/components/game-player.tsx` is likewise a **fake game**: the score just ticks up via a `setInterval` in the component (`game-player.tsx:23`) — no canvas, no iframe, no real game engine wired in yet.
- `referencias/templates/` holds the original HTML/JSX mockups each screen is ported from. It's reference material, not app source — excluded from ESLint in `eslint.config.mjs`.
- `referencias/RRO5vePTlqkYrGHjYdtf_started-games/` holds three complete vanilla-JS/canvas games (Asteroids, Tetris, Arkanoid) — likely starting material for when `game-player.tsx` above stops faking it. Nothing in `app/`, `lib/`, or `data/` references them yet. Each game ships its own `CLAUDE.md` (and `04-arkanoid` its own `.claude/skills/` and `specs/`) — those don't apply to this repo, don't follow them. The dir also carries a committed `__MACOSX/` junk folder from unzipping. Like `templates/`, all of this is excluded from both ESLint and Prettier.

### Lint gotcha: `react-hooks/set-state-in-effect`

`eslint-config-next`'s `core-web-vitals` preset enables newer React Compiler lint rules, including `react-hooks/set-state-in-effect`, which errors on **any** `setState(...)` call written directly inside a `useEffect` body — even a conditional one. This bit us twice while building the current screens:

- Reading an external mutable source (e.g. `localStorage`) → use `useSyncExternalStore`, not `useEffect` + `useState` (see `session-provider.tsx`).
- Deriving one piece of state from another (e.g. game level from score) → compute it inline during render instead of syncing it via an effect (see `game-player.tsx`).

### Lint gotcha: `globalIgnores` in `eslint.config.mjs` overrides, doesn't merge

`eslint.config.mjs` calls `globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "referencias/**"])` to exclude `referencias/`. Because flat-config `globalIgnores` replaces `eslint-config-next`'s default ignore list rather than adding to it, that array has to re-list the framework's own defaults (`.next/**`, `out/**`, etc.) alongside the project-specific one — don't assume a new ignore just merges in on top of what `eslint-config-next` already excludes.

## Spec Driven Design workflow — active

The `/spec` and `/spec-impl` skills (based on the practices at https://github.com/Klerith/fernando-skills) are in active use — see `specs/`. Write a spec with `/spec` before implementing any screen or flow not already covered by one; only run `/spec-impl` once a spec's `Status:` field indicates it's approved (the three specs so far all say `Status: implementado` once done — the repo's approval vocabulary is Spanish, not the literal word "Approved"/"Aprobado"). `specs/.spec-config.yml` sets `AutoCreateBranch: true`, so `/spec-impl` creates and switches to a `spec-NN-slug` branch (e.g. this branch, `spec-03-contacto-envio-real-con-resend`) without asking.

Both skills, plus `frontend-design` (from `anthropics/skills`), actually live in `.agents/skills/`; `.claude/skills/` holds symlinks to them, pinned by hash in `skills-lock.json` at the repo root. Don't hand-edit the `SKILL.md` files — reinstall via `npx skills@latest add <source>` instead (see `README.md`). All three skills set `disable-model-invocation: true`, so they only run when explicitly invoked (`/spec`, `/spec-impl`), never picked automatically.
