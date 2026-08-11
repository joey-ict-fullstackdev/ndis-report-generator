# Reconciliation — render phase vs commit phase, and what memoization actually does

**One-sentence version (what I'd say first in an interview):**
Rendering starts at the component that owns the changed state — not the root — and walks down its subtree; the render phase calls your functions and diffs the JSX against the existing fiber tree, the commit phase applies only the flagged changes to the DOM, so identical output costs a function call but never a DOM write, and `React.memo` is purely a render-phase optimization.

**How it works (my own words, no copy-paste):**
When `setState` fires, React re-renders the *owning* component and everything below it. Siblings are untouched — the render subtree is bounded by where the state lives, which is why state placement is the real performance lever.

Render phase: React calls each component, gets back JSX (plain objects), and diffs it against the persistent fiber tree by position + type + key, then prop-by-prop. Fibers that changed get flagged. This phase is interruptible and disposable — React may double-invoke it (StrictMode) or throw it away entirely (concurrent rendering), which is why render must be pure: a side effect in render can fire without ever being committed (e.g. a `fetch` to `/api/generate` during render would bill the Anthropic API twice with nothing on screen to show for it).

Commit phase: React walks the flagged fibers and applies exactly those DOM mutations, then runs effects. **Commit is a function of flags, not of renders.** The nuance that surprised me: if a re-rendered component produces identical JSX, the diff sets no flags and commit does *zero* DOM work on it — no memo required. "Memo prevents DOM updates" is a red-flag answer; the reconciler already skips those. What `React.memo` actually does is skip the *function call and diff*: when the parent re-renders, it shallow-compares prev/next props with `Object.is` and bails out if equal. A bailed-out subtree contributes nothing to commit — no flags, no DOM work, no effect re-runs.

`useMemo`/`useCallback` solve a different problem: reference instability *inside* one component's render. They don't skip rendering — they hand back the same value/function reference if deps are unchanged. That only matters when something *compares* the reference: a memoized child's prop check, or an effect dep array. `useCallback` alone is pure overhead. Its one solo case is `useMemo` skipping a genuinely expensive recomputation.

**Where it shows up in my project (file + what happened):**
`app/page.tsx` — typing in `ParticipantForm`'s Name field re-renders only `ParticipantForm`'s subtree. `GoalForm` and `NotesForm` are never even called (siblings; the state lives inside `ParticipantForm`). So wrapping `NotesForm` or `GoalRow` in `React.memo` right now would change *nothing observable*: there's no render arriving for memo to intercept, and even when `GoalForm` does re-render, inline props would fail the shallow compare without `useCallback` — while the diff was already producing zero DOM work. State placement already delivered what memo would pretend to deliver. Memoization here would be negative trade: guaranteed bookkeeping cost against a speculative saving, with no Profiler evidence of slow renders.

**Explain-back Q&A (from the coaching session):**

*Render vs commit phase:*

1. *Typing in `ParticipantForm`'s Name field re-renders the whole form. Walk one nested `<Label>` through both phases — what happens in each, and what doesn't happen?* Render phase: `ParticipantForm` and `Label` are called, new JSX objects are produced and diffed against the existing fibers; type/key match, props are identical, no flag is set. Commit phase: the fiber carries no flag, so commit performs zero DOM operations on it. What doesn't happen: any DOM read or write — the cost was JavaScript function calls only.

2. *Why does render-phase purity matter — what can React do to render work that it can't do to commit work?* React can invoke render multiple times (StrictMode double-invoke in dev) and can start, interrupt, and discard an entire render without committing it (concurrent features like `useTransition`). Commit is synchronous, uninterruptible, and happens exactly once per committed update — so side effects in render can fire for work that never reaches the screen, while effects in `useEffect`/event handlers only run for work that actually committed.

3. *`console.log` in a component body is technically a side effect — why is it harmless, and how does it differ from a `fetch` in render?* Both execute on every (possibly discarded) invocation, but `console.log` changes no observable program state — re-running it is idempotent, the worst case is duplicate log lines. A `fetch` mutates the outside world: it bills the API, creates server-side state, and races responses. The test is idempotence: "would my app misbehave if this ran 5 times or ran and was thrown away?" Logging passes; posting to `/api/generate` does not.

*What `React.memo` does:*

4. *A memoized child receives `options={["OT", "PT"]}` written inline in the parent's JSX. Does memo work?* No — the array literal creates a new reference every parent render, and memo's shallow `Object.is` comparison compares references for objects/arrays, so it never bails out. The two standard fixes: hoist the value to a module-level constant, or stabilize it with `useMemo` in the parent.

5. *A memoized component calls `useState` and its setter fires. Does memo prevent the re-render?* No. Memo only intercepts the parent-driven render path (the props comparison at the boundary). Re-renders triggered by the component's own `useState` or `useContext` bypass memo entirely — which makes sense, because memo has no "previous render triggered by new internal state" to reuse; the state genuinely changed, so fresh output is required.

6. *Why is "memo prevents unnecessary DOM updates" a red-flag answer?* Because unchanged output never produces DOM updates anyway — the render-phase diff sets no flags for identical JSX, so commit does nothing to those fibers with or without memo. The answer reveals the candidate doesn't know where the DOM-skip decision is actually made (the reconciler, not memo).

7. *What determines whether a fiber gets DOM work in commit, and where is that decided?* Whether the fiber was flagged during the render-phase diff. Commit is purely an executor: it walks the work-in-progress tree and applies flags; the decision itself was made upstream by the reconciler comparing new elements against current fibers.

8. *"Memo doesn't prevent DOM updates" but "a memoized subtree contributes zero commit work" — reconcile these. Give an example of a re-render with zero commit work.* Memo doesn't prevent DOM updates because there were never going to be any for unchanged output; and when memo bails out, no diff runs in the subtree, so no flags are set, so commit skips it entirely — the two statements describe the same flag-driven mechanism from opposite ends. Example without memo: typing in `ParticipantForm` re-renders `DateField`, which returns identical JSX — the diff runs, finds nothing, sets no flags, and commit does zero work on it despite the re-render.

9. *Why does React walk the tree in commit instead of keeping a flat list of flagged fibers?* Deletions and insertions need structural context: removing a subtree requires unmounting its descendants in order (running their cleanups, releasing refs), and placing a new node requires knowing its parent and sibling position in the host tree. A flat list loses the parent/child relationships needed to sequence those mutations correctly.

*useMemo/useCallback and the applied question:*

10. *`useCallback` returns the same function reference every render — why does that alone change nothing?* A stable reference has no intrinsic value; React never compares two function objects for its own sake. Something downstream must *consume* the reference in a comparison — a memoized child's shallow prop check or a `useEffect`/`useMemo` dependency array — or the stability is wasted.

11. *A colleague memoizes `NotesForm` and wraps its props in `useCallback` — why is that dead code here?* `NotesForm` is a sibling of `ParticipantForm`, and the state lives inside `ParticipantForm`, so typing never puts `NotesForm` in the render path at all. Memo can only skip a render that's about to happen; the guard never fires.

12. *When is `useMemo` justified without a memoized child or effect dep?* When the computation itself is expensive and the inputs rarely change — e.g. re-running `verifyReport` over a large generated report on every keystroke in the draft editor. There the *value* matters, not the reference. At this app's current scale it's still cheaper to recompute; measure first.

**Question I'd ask a candidate to test this:**
"A child component re-renders but returns JSX identical to last time. Does React touch the real DOM? Where is that decision made, and what exactly would `React.memo` have saved?" — A good answer separates the phases: the decision is made in the render-phase diff over fibers (no flags → no commit work, DOM untouched either way), and memo only saves the function call plus the subtree diff — not any DOM work. Bonus depth: naming shallow `Object.is` comparison and the inline-reference failure mode.
