# Fetch races and what AbortController actually guarantees

Three interview-answer-worthy points in one concept.

## 1. Resolution order ≠ click order

The event loop guarantees the order in which your **callbacks fire**, not the order in which the underlying async work **finishes**. Two fetches travel through the network and server on independent timelines, so latency decides which response lands first — nothing guarantees request 1's response arrives before request 2's. Worst case: the stale response arrives _last_ and silently overwrites the fresh one. No error, no warning — just wrong data on screen.

## 2. What AbortController actually guarantees

Calling `controller.abort()` guarantees exactly one thing: **the fetch promise tied to that signal rejects with an `AbortError`.** Your client-side code will never process that response.

What it does _not_ guarantee: that the in-flight HTTP request stops instantly, or that the server never processed it. The request may have already been handled — abort is a **client-side unsubscribe**, not a server-side undo.

That's why the guarantee is "cannot be wrong" rather than "usually right": the rejection isn't a race you usually win, it's a **contract**. A fetch with an aborted signal _always_ rejects, so the `AbortError` branch _always_ runs, so the stale response _can never_ write state. You don't win the race — you make the race irrelevant.

## 3. Event handler vs. effect

**Event handler:** "the user did X, so do Y." Runs once per interaction, outside the render cycle. One-off imperative actions — starting a fetch, aborting the previous one, updating state — belong here. Clicking "Generate" is a textbook event-handler job.

**`useEffect`:** "whenever this rendered value changes, make an external system match." It **synchronizes** render output with something outside React — a subscription, a timer, a DOM property. Cleanup functions exist because an effect can be told to re-run **before its previous work finished**, and cleanup is your chance to tear down the stale run.

**The distinction that matters:** an effect re-runs _because a value changed_; a handler runs _because the user acted_. Fetch-on-click is an action, so it lives in a handler — where _you_ own cancellation explicitly via the controller in a `useRef`. Fetch-on-value-change (e.g. live search-as-you-type) is synchronization, so it lives in an effect — where cleanup aborts the previous run.

⚠️ **React has no hook that cancels stale work automatically.** Cleanup functions are a _place where you write the cancellation yourself_. If a candidate claims React auto-cancels, an interviewer will push on it immediately.

## Question I'd ask a candidate

_"You abort a stale request with AbortController before firing a new one — does that guarantee the server never processed the first request? What exactly did you just guarantee, and what didn't you?"_

**Model answer:** No — the server may have fully processed it; abort doesn't reach backwards in time. What you guaranteed is narrower and sufficient: the stale fetch's promise **will reject**, so its result can never reach your state. You also did _not_ guarantee the network request stopped — the bytes may still flow. Abort is about **protecting your UI's state ownership**, not about undoing work on the server.
