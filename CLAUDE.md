# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite is configured.

## Environment Variables

Required in `.env.local`:

```
GOOGLE_SHEET_ID=
GOOGLE_SHEETS_API_KEY=          # Read-only (public API key)
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # Write operations (JWT auth)
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Architecture

**Google Sheets is the database.** All persistent data lives in a single spreadsheet with named sheets:

| Sheet      | Range   | Purpose                                               |
| ---------- | ------- | ----------------------------------------------------- |
| `matches`  | A1:M50  | Match results, scores, MOM, attendees, photo URLs     |
| `roster`   | A1:J50  | Player registration (등번호, 이름, 포지션)            |
| `stats`    | A1:G50  | Season stats (appearances, goals, assists, MOM count) |
| `notice`   | A1:D20  | Only row 2 is shown on the dashboard                  |
| `lineup`   | A1:S100 | Formation + 11 players + 5 subs per match/quarter     |
| `feedback` | A1:D500 | Match feedback comments                               |
| `mom_vote` | A1:E500 | Man-of-the-match votes                                |

**Two separate auth paths for Sheets:**

- `app/lib/google-sheets.ts` — reads via public API key (`GOOGLE_SHEETS_API_KEY`)
- `app/lib/sheets-write.ts` — writes via Service Account JWT (manual RS256 signing using Node's `crypto` module — no googleapis SDK)

**Data flow:**

1. `app/page.tsx` (Server Component) fetches all sheets in parallel and transforms `string[][]` rows into typed objects
2. Typed props are passed to `DashboardClient` (Client Component) which owns all UI state
3. Mutations go through API routes in `app/api/` which call `sheets-write.ts`

**matches sheet column mapping** (used throughout the codebase):

```
A=date, B=time, C=location, D=opponent, E=ourScore, F=theirScore,
G=result, H=type, I=goals, J=assists, K=MOM, L=attendees, M=photos(CSV)
```

Row index in the sheet = `matchId + 2` (header offset). This arithmetic appears in all write functions.

**lineup sheet** stores one row per `(matchId, quarter)` pair with 19 fixed columns: `matchId, quarter, formation, p1–p11, sub1–sub5`.

**Photo storage:** Cloudinary. `app/api/photos/sign/route.ts` generates a signed upload URL; after upload the Cloudinary URL is written to `matches!M{row}` as a comma-separated list (max 5 photos per match).

## UI Structure

The app is **mobile-first** (max-w-md container). Dark mode is supported via `next-themes`.

- `app/components/DashboardClient.tsx` — main client component with tabs (대시보드 / 순위 / 로스터)
- `app/components/FormationField.tsx` — renders soccer formation by position, supports 7 formation types
- `app/matches/[id]/` — match detail page; `/edit` sub-route is the drag-and-drop lineup editor
- `app/components/ui/` — Shadcn UI components (do not modify generated files)

Player ranking score = `goals + assists + mom + apps` (descending), ties broken by Korean name alphabetical order.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
