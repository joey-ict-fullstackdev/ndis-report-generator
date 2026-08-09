# Learning Plan — React internals & end-to-end type safety

Goal: interview-depth knowledge of React rendering/reconciliation, TypeScript, and
end-to-end type-safe patterns (tRPC), learned by building this project myself.
Trigger: clear.AI interview feedback (July 2026) — reconciliation/tree-diffing answers
were too shallow; role wanted tRPC/Convex familiarity.

How each session works:
1. Coach explains ONE concept, pointed at files in this repo.
2. I implement the exercise myself (stuck >30 min → ask for a hint, not the answer).
3. Coach reviews my diff and asks questions.
4. I explain the concept back as if in an interview. Only then do we advance.
5. I write a short note in `notes/` in my own words (see `notes/TEMPLATE.md`).

---

## Phase 0 — Own the skeleton (setup homework)

- [x] Write `tsconfig.json` (know what `strict`, `moduleResolution`, and `jsx` do)
- [x] **Implement `lib/verify.ts` test-driven**: the stub throws; make `npm test` (7 tests
      in `lib/verify.test.ts`) go red → green. This is the heart of the pitch — it must
      be mine. No coach code.
- [x] Get `npm run typecheck`, `npm test`, and `npm run build` passing
- [x] Write `evals/run.ts`: load the 3 cases in `data/synthetic/`, call `generateReport` + `verifyReport`, assert (goal count matches input; goal_text preserved; evidenced goals have ≥1 verified claim; the zero-evidence goal in case 3 is `insufficient_evidence` or fully flagged); exit non-zero on failure
- [x] Write `README.md` (what it is, the traceability engine, quick start, synthetic-data disclaimer)
- [x] Write `.github/workflows/ci.yml` (typecheck + unit tests on push)
- [x] Connect the repo to Vercel for CD: preview deployment per PR, auto-deploy on
      merge to main. After this I can honestly describe a full CI/CD pipeline:
      push → typecheck/tests (CI) → preview deploy → merge → production (CD)

## Phase 1 — React rendering & reconciliation  ← the interview gap

I build the entire UI myself, component by component (`app/page.tsx` is a stub with the
feature list; product spec in `PITCH.md`). Each step pairs a build task with a concept:

- [ ] **Input form + what triggers a render**: build participant/goals/notes form as
      separate components; use React DevTools Profiler to explain what re-renders when
      I type in one input, and why
- [ ] **Goals/claims editor + reconciliation & keys**: build the per-goal editor with
      "delete goal" and "reorder goals"; get list keys wrong at least once on purpose,
      observe what breaks, fix it, and explain exactly what React's diffing did
- [ ] **Render vs commit; memo/useMemo/useCallback**: measure my UI first, optimize only
      what's actually slow
- [ ] **Generate flow + effects & race conditions**: wire up the /api/generate call;
      demonstrate the stale-response race (click twice fast), fix with AbortController;
      explain event-handler fetch vs useEffect fetch
- [ ] **Evidence trail + DOCX export**: render verified ✓ vs flagged ⚠ claims per goal;
      wire `exportDocx`
- [ ] ✅ Checkpoint: answer "walk me through setState → pixels on screen" unprompted,
      using this app as the example

## Phase 2 — TypeScript depth

- [ ] Dissect `lib/verify.ts`: `Omit`, inferred return types, `z.infer`; extend without `any`
- [ ] Replace loading/error/data useStates in the page with ONE discriminated union
      ("make impossible states unrepresentable")
- [ ] ✅ Checkpoint: trace one type from Zod schema → API boundary → UI prop, out loud

## Phase 3 — End-to-end type safety (tRPC)  ← the interview gap

- [ ] Migrate `/api/generate` from REST route to a tRPC router (Zod input on the procedure,
      typed client, React Query)
- [ ] Prove it: rename a schema field server-side, watch the client fail to compile
- [ ] Write a one-page compare/contrast: REST vs tRPC vs Convex — when each fits
- [ ] ✅ Checkpoint: build a brand-new tRPC procedure end-to-end with no reference material

## Phase 4 — v2 backend: persistence & auth

- [ ] Postgres + Drizzle: saved reports, revision history (schema → query → API → UI,
      one type system end to end)
- [ ] Auth (NextAuth or similar): clinic login
- [ ] ✅ Checkpoint: explain a migration you wrote and why the schema is shaped that way

## Phase 5 — Interview drilling (ongoing, end of each phase)

- [ ] 15-min mock interview per phase; answers must use examples from this codebase
- [ ] `notes/` folder complete enough to be the revision sheet before any interview

## Phase 6 — OPTIONAL: Docker + AWS migration (only if calendar allows)

Boundary rules — the coach should push back if I try to start this early:
- Do NOT start before Phases 1–4 are checked off. v1 ships on Vercel.
- CI/CD is already covered by Phase 0 (Actions + Vercel) — this phase teaches
  containers and cloud infra, which is a different lesson.
- The Camay project (separate repo) owns the AWS Lambda/DynamoDB/API Gateway story;
  don't duplicate it here.

- [ ] Dockerize the Next.js standalone build (multi-stage Dockerfile; explain each stage)
- [ ] Push the image to ECR; run it on AWS App Runner
- [ ] Extend the GitHub Actions pipeline: build image → push to ECR → deploy
- [ ] Write up the migration: Vercel vs containerized AWS — what changed, what it cost,
      when each is the right choice
- [ ] ✅ Checkpoint: explain the Dockerfile line by line, and what the pipeline does on
      every push, without notes
