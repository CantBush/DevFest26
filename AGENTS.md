<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Movingly project rules

- **Read `PLAN.md` first.** It is the spec: screens (section 4), quiz (6), checklist (7), Gemini (8), maps (9), settings (10), data model (11). Work on one milestone from section 3 at a time.
- **Stay in your track's files** (PLAN.md section 3.4). Person A (frontend) owns `src/app/*` pages except `src/app/api/`, `src/components/`, `src/lib/quiz/`, `public/sprites/`. Person B (backend) owns `src/app/api/`, `src/lib/checklist/`, `src/lib/gemini/`, `src/lib/maps/`, `src/lib/firebase/`, `firestore.rules`.
- **Shared files need a heads-up:** `src/lib/types.ts`, `src/lib/fixtures/`, `package.json`, `.env.example`, `PLAN.md`, `AGENTS.md`. If a change is needed there, stop and ask the human before editing.
- **Use the shared types.** Import from `@/lib/types`; validate untrusted data (API bodies, Gemini output, Firestore reads) with the zod schemas there.
- **Build screens against fixtures** (`@/lib/fixtures`) until the real data layer exists.
- **Secrets stay on the server.** `GEMINI_API_KEY` and `GOOGLE_MAPS_SERVER_KEY` are only read in `src/app/api/` and `src/lib/gemini/`, `src/lib/maps/`. Never prefix them with `NEXT_PUBLIC_`, never log them, never commit `.env.local`.
- **Gemini never invents places or links** (PLAN.md section 8.3).
- **Cache Components is on** (`cacheComponents: true` in `next.config.ts`). Pages that read params or other runtime data need a `<Suspense>` boundary; check the bundled docs before working around it.
- **Before finishing, run:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Fix what you broke.
- **Tick the milestone checkbox** in `PLAN.md` when the milestone is done.
