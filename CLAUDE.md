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

`.mcp.json` declares a project-scoped `supabase` MCP server (HTTP, docs/account/database/debugging/development/functions/branching features), enabled per-user via `enabledMcpjsonServers` in `.claude/settings.local.json`. As of SPEC 04 the app uses Supabase for authentication (`@supabase/supabase-js` + `@supabase/ssr` in `package.json`, project `infuthprfvgsjflqmsby`): `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (`async`, `await cookies()`), and `lib/supabase/proxy.ts` (`updateSession`, invoked from the root `proxy.ts` — Next 16 renamed `middleware.ts` to `proxy.ts`, see the version note above) refresh the session on every request via `supabase.auth.getClaims()`, never `getSession()` server-side. As of SPEC 06 it also holds the game catalog and real player scores: `public.games` (8 seeded rows), `public.scores` (one row per finished game with a real engine, RLS-gated so a row can only be inserted with `auth.uid() = user_id`), and a `public.game_stats` view (`best`/`plays`/`last_played_at` per game, declared `security_invoker` so it doesn't bypass `scores`' RLS) — all read server-side through `lib/games-data.ts`. `supabase/migrations/` holds the versioned SQL for `public.profiles` (per-user nickname, RLS, `handle_new_user` trigger), `public.games`, and `public.scores`, applied via the MCP server's `apply_migration`. The MCP server is also a docs/DB-exploration tool beyond just this integration.

The contact form (`/acerca`) needs a `.env.local` with `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` (see `.env.example`) or `POST /api/contacto` returns `500 { error: "server" }`. Without a verified domain in Resend, `CONTACT_TO` must be the email address the Resend account itself was created with — any other recipient is rejected by Resend.

## Architecture

- App Router project (`app/` directory), TypeScript in strict mode, path alias `@/*` → project root.
- Styling via Tailwind CSS v4 (`@tailwindcss/postcss`), configured through `app/globals.css` rather than a `tailwind.config.js`. `globals.css` also carries a hand-authored retro "Arcade Vault" theme (CSS custom properties, semantic classes like `.card`, `.btn`, `.crt`) ported 1:1 from `referencias/templates/styles.css` — reuse those classes, don't invent Tailwind utility equivalents for screens that already have one.
- `app/layout.tsx` is the root layout; note the `LayoutProps<"/">` typed props pattern used there — a Next.js 16 App Router convention, not the plain `{ children: React.ReactNode }` signature from older versions. It wraps every page in `SessionProvider` → `Nav` → `<main className="av-main">{children}</main>` → `SiteFooter`.
- `app/fonts.ts` — `next/font/google` loaders (`pressStart2P`, `courierPrime`, `jetBrainsMono`), exposed as CSS variables and consumed by `globals.css`.
- Real routes: `/` (Landing), `/biblioteca` (Biblioteca), `/acerca` (Acerca de / Contacto), `/juegos/[id]` (Detalle), `/juegos/[id]/jugar` (Reproductor), `/auth` (Acceso), `/salon` (Salón de la Fama). Dynamic pages use the `PageProps<'/juegos/[id]'>` global helper with `await params` (see the Next.js version note above).
- `app/api/contacto/route.ts` — Route Handler (`POST`). Validates with `lib/contact.ts`, applies an in-memory honeypot + per-IP rate limit, then sends the message via Resend. Reads `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` from `.env.local` (see `.env.example` for the shape).
- `app/auth/confirm/route.ts` — Route Handler (`GET`), the target of the Supabase "Confirm signup" email link. Calls `supabase.auth.verifyOtp({ type, token_hash })` and redirects to `/biblioteca` on success or `/auth?error=confirm` on failure.
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` — the three Supabase client factories (browser, server/`async`, proxy), plus `proxy.ts` at the repo root. All read `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local`.
- `lib/contact.ts` — shared contact-form validation (`validateContact`), used by both the client form and the route handler above.
- `lib/games-data.ts` — server-side reads of the catalog and scores (`getGames`, `getGame`, `getCategories`, `getGameScores`, `getTopPlayers`, `getRecentScores`, `getSiteStats`), used from the `page.tsx` of `/`, `/biblioteca`, `/juegos/[id]`, `/juegos/[id]/jugar`, and `/salon`, which are all Server Components that fetch there and pass the results down as props. Exports the shared `Game`/`ScoreRow`/`TopRow`/`TickerRow` types. There is no `data/` directory anymore — SPEC 01's mock catalog (`GAMES`, `CATS`, `seededScores`, `HOME_TICKER`, `HOME_TOP`, `HOME_STATS`) was fully replaced by SPEC 06.
- `app/components/` — one component per screen (`home.tsx`, `library.tsx`, `game-card.tsx`, `leaderboard.tsx`, `game-player.tsx`, `auth-form.tsx`, `hall-of-fame.tsx`, `about-contact.tsx`), plus `nav.tsx`, `site-footer.tsx`, `session-provider.tsx`, `pixel-icons.tsx` (shared inline SVG icons) and `use-reveal.ts` (shared scroll-reveal `IntersectionObserver` hook).
- `app/components/session-provider.tsx` wraps real Supabase authentication (email + password, with email confirmation required): `useSession()` exposes `user: Profile | null` (`{ id, email, nickname }`, backed by `public.profiles`), `loading`, `signUp`, `signIn`, `signOut` — all `async`, driven by `supabase.auth.onAuthStateChange`. There is no `saveScore` on the context; score persistence lives in `game-player.tsx` instead (see below).
- `app/components/game-player.tsx` mounts a real `<canvas>` game engine when the active game has one registered in `lib/games/registry.ts` (`GAME_ENGINES`, currently `rocas` → `lib/games/asteroids/`, `tetris` → `lib/games/tetris/`, and `bloque-buster` → `lib/games/bloque-buster/`, all dynamically `import()`ed). Every other game in the catalog still falls back to the original **fake game** arena: the score just ticks up via a `setInterval` in the component — no canvas, no iframe, no real game engine wired in. `lib/games/types.ts` defines the shared `EngineCallbacks`/`ArcadeEngine`/`EngineFactory` contract (SPEC 05) that any future ported game plugs into the same way. As of SPEC 06, when a game has a real engine and there's a signed-in session, reaching game over auto-inserts a row into `public.scores` via `lib/supabase/client.ts`; the modal's save button reflects that as `GUARDANDO…` / `GUARDADO ✓` / `REINTENTAR`, or a link to `/auth` when there's no session. Games without a real engine never show that block — there's no real play to save.
- `referencias/templates/` holds the original HTML/JSX mockups each screen is ported from. It's reference material, not app source — excluded from ESLint in `eslint.config.mjs`.
- `referencias/started-games/` holds three complete vanilla-JS/canvas games (Asteroids, Tetris, Arkanoid). `02-asteroids/game.js` was hand-ported to TypeScript as `lib/games/asteroids/` (SPEC 05) and is wired into the `rocas` entry via `game-player.tsx`; `03-tetris/game.js` was likewise hand-ported to `lib/games/tetris/` (SPEC 07) and wired into the `tetris` entry (the catalog row was originally seeded as `caida`/"CAÍDA" in SPEC 06, then renamed to `tetris`/"TETRIS" after SPEC 07 shipped); `04-arkanoid/game.js` was hand-ported to `lib/games/bloque-buster/` (SPEC 08) and wired into the `bloque-buster` entry — the first port with binary assets (`assets/spritesheet-breakout.png` and two `.mp3` sound effects), copied into `public/juegos/bloque-buster/` and referenced by absolute path, since `referencias/` itself is never served to the browser. Nothing in `app/`, `lib/`, or `data/` imports these reference files directly. Each game ships its own `CLAUDE.md` (and `04-arkanoid` its own `.claude/skills/` and `specs/`) — those don't apply to this repo, don't follow them. The dir also carries a committed `__MACOSX/` junk folder from unzipping. Like `templates/`, all of this is excluded from both ESLint and Prettier.

### Lint gotcha: `react-hooks/set-state-in-effect`

`eslint-config-next`'s `core-web-vitals` preset enables newer React Compiler lint rules, including `react-hooks/set-state-in-effect`, which errors on **any** `setState(...)` call written directly inside a `useEffect` body — even a conditional one. This bit us twice while building the current screens:

- Deriving one piece of state from another (e.g. game level from score) → compute it inline during render instead of syncing it via an effect (see `game-player.tsx`).
- Subscribing to an async source (e.g. `supabase.auth.onAuthStateChange`) → the subscription itself goes in the effect body, but the `setState` call has to live inside the listener's callback, not directly in the effect body — even though the callback is defined and passed synchronously within that same effect (see `session-provider.tsx`).

### Lint gotcha: `globalIgnores` in `eslint.config.mjs` overrides, doesn't merge

`eslint.config.mjs` calls `globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "referencias/**"])` to exclude `referencias/`. Because flat-config `globalIgnores` replaces `eslint-config-next`'s default ignore list rather than adding to it, that array has to re-list the framework's own defaults (`.next/**`, `out/**`, etc.) alongside the project-specific one — don't assume a new ignore just merges in on top of what `eslint-config-next` already excludes.

## Spec Driven Design workflow — active

The `/spec` and `/spec-impl` skills (based on the practices at https://github.com/Klerith/fernando-skills) are in active use — see `specs/`. Write a spec with `/spec` before implementing any screen or flow not already covered by one; only run `/spec-impl` once a spec's `Status:` field indicates it's approved (specs so far say `Status: implementado` once done — the repo's approval vocabulary is Spanish, not the literal word "Approved"/"Aprobado"). `specs/.spec-config.yml` sets `AutoCreateBranch: true`, so `/spec-impl` creates and switches to a `spec-NN-slug` branch (e.g. this branch, `spec-06-catalogo-y-puntuaciones-en-postgres`) without asking.

`/spec`, `/spec-impl`, and `frontend-design` (from `anthropics/skills`) are installed skills: they actually live in `.agents/skills/`, and `.claude/skills/` holds symlinks to them, pinned by hash in `skills-lock.json` at the repo root. Don't hand-edit their `SKILL.md` files — reinstall via `npx skills@latest add <source>` instead (see `README.md`). All three set `disable-model-invocation: true`, so they only run when explicitly invoked (`/spec`, `/spec-impl`), never picked automatically.

`/juego-nuevo` is a fourth skill, hand-authored for this repo (not installed, so it's not in `skills-lock.json`) and lives directly at `.claude/skills/juego-nuevo/` — a real directory, not a symlink. It's a specialized front end to `/spec` for the one recurring feature this repo keeps needing: porting a playable game into the `ArcadeEngine` contract (`lib/games/types.ts`) and wiring it into `lib/games/registry.ts`. It writes a spec and stops there, same as `/spec` — `/spec-impl` still does the implementation once that spec is approved. It also sets `disable-model-invocation: true`.
