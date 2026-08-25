# tRPC mutation vs query

**One-sentence version (what I'd say first in an interview):**

The label isn't about HTTP methods — it's a promise about side effects: a **query** promises "re-running me is harmless and free," a **mutation** promises "running me has consequences," and React Query acts on that promise.

**How it works (my own words, no copy-paste):**

React Query _believes the label_ and behaves accordingly.

- **Query** = "this only reads stuff." React Query treats queries as safe to re-run whenever it feels like it: user switches browser tabs and comes back → re-run; Wi-Fi reconnects → re-run; component remounts → re-run; cache invalidated → re-run. For "fetch a list of users" that's great — fresh data for free.
- **Mutation** = "this does something." React Query promises to _never_ run a mutation on its own. It only runs when you explicitly call `mutate()` — i.e., when the user clicks the button. You also get per-invocation state for free: `isPending` (spinner), `isError`, `data`.

The "both compile to POST anyway" gotcha: the HTTP method doesn't protect you. The transport is an implementation detail — the label is what controls client behavior. Pick the wrong label and the client will happily re-run your expensive code behind your back.

**Rule of thumb:** reads are queries; anything with side effects (LLM calls, writes, payments, emails) is a mutation.

**Where it shows up in my project (file + what happened):**

`server/router.ts` — the `generate` procedure is a **mutation** because it calls the LLM and costs real money per call. If it were a query, a background refetch (tab refocus, reconnect) would trigger another LLM call and another charge with no user action. As a mutation, it only runs when the "Generate report" button calls `mutate()`.

**The mistake I made / bug I hit, and why it happened:**

(No bug yet — caught at design time. The mistake to _avoid_: labeling a costly/side-effecting procedure as a query because "it returns data." Anything can return data; the question is whether re-running it is free.)

**Question I'd ask a candidate to test this:**

"Both queries and mutations can be POST requests under the hood. So what actually breaks if you label an expensive, non-idempotent operation as a query?" (Answer: React Query's automatic refetching — on focus, reconnect, remount, invalidation — will re-execute it with no user action.)
