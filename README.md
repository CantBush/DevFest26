# Movingly

A mobile-first web app that turns a short onboarding quiz into a personalized moving checklist. Built for DevFest26 with Next.js, Firebase, Gemini, and Google Maps.

The full spec and the two-person work split are in [PLAN.md](PLAN.md).

## Run it locally

1. Install Node.js 22 or newer.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in the keys (see PLAN.md section 2 for where each one comes from).
4. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Firebase

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # pick your Firebase project
firebase deploy --only firestore:rules
```
