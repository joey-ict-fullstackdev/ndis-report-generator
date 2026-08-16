# The render → commit pipeline: what happens after setState

**One-sentence version (what I'd say first in an interview):**
`setState` only schedules work — React then renders (build a new element tree), reconciles (diff against the fiber tree), commits (mutate the DOM, synchronously), the browser paints, and only then do passive effects run.

**How it works (my own words, no copy-paste):**

1. **setState schedules — it doesn't touch the DOM synchronously.** The setter enqueues an update and schedules a render. Multiple `setState` calls in the same handler are **batched** into a single render pass — one re-render, not one per call.

2. **Render phase — call the function, build new elements.** React re-invokes `Home()` top-down from the nearest fiber with pending work. The output is a fresh tree of **React elements** — plain JS objects describing UI, _not_ DOM nodes.

3. **Reconciliation — diff the new tree against the fiber tree.** React walks the new element tree alongside the previous render's fiber tree, position by position:
   - Same type at the same slot → **reuse** that fiber, just update its props/state
   - Different type at the same slot → **tear down** the old subtree, mount a new one from scratch

   Refinement (ties into [keys-reconciliation.md](keys-reconciliation.md)): position-by-position matching is exact for a _single_ child slot. For **arrays of children**, React matches by `key` instead of raw array position — without a stable key, "same position" silently means "same index," and inserting or reordering breaks the match.

4. **Commit phase — the DOM actually changes here.** React walks the effect list and calls into react-dom's host config. This is the **only** stage where the real DOM tree is mutated — synchronously and uninterruptibly.

5. **Browser paint.** Once commit finishes and JS yields the main thread, the browser's pipeline takes over: style recalculation → layout → paint → composite.

6. **Passive effects run after paint.** `useEffect` callbacks are scheduled asynchronously — the browser has _already shown the frame_ before they run. (That's why layout measurements belong in `useLayoutEffect`, which fires during commit, not after paint.)

**Where it shows up in my project (file + what happened):**
`app/page.tsx` — the Generate handler's multiple `setState` calls (reset error/data, set loading) batch into one render. The double-click abort race is a _commit-ordering_ problem: two fetches resolve in latency order, not click order, and without the `AbortError` guard the stale fetch's `setState` would schedule a commit _after_ the fresh one — overwriting it.

**The mistake I made / bug I hit, and why it happened:**
Assuming effects run "when React finishes" — they run _after paint_, asynchronously. Code in `useEffect` that expected to pre-empt the visible frame can't; the user sees one painted frame before the effect fires.

**Question I'd ask a candidate to test this:**
"If `setState` doesn't touch the DOM, when _does_ the DOM change — and what could still be running after the user already sees the updated screen?" (Answer: commit phase mutates the DOM synchronously; passive effects and anything they trigger run after the frame is painted.)
