# tRPC middleware chain

**One-sentence version (what I'd say first in an interview):**

A tRPC procedure call runs through an ordered middleware chain before the resolver — and `.input()` validation is just the first middleware tRPC installs for you, not a special separate phase.

**How it works (my own words, no copy-paste):**

When a request hits a procedure, tRPC runs middleware in the order it was attached, each one wrapping the next (like an onion): middleware → ... → resolver. Each middleware can inspect/modify the context, short-circuit with an error, or pass control on via `next()`.

The key insight from reading a real stack trace: `inputValidatorMiddleware` appears _before_ `procedure` in the chain. So the Zod `.input()` schema isn't magic bolted onto the side of tRPC — it's literally the first middleware in the pipeline. Anything I add later (logging, auth, rate limiting) slots into that same chain, in the order I attach it with `.use()`.

Practical consequence: input validation runs _before_ my resolver code, so malformed input is rejected (400 BAD_REQUEST) without the LLM ever being called — no money spent on garbage requests. Same would hold for an auth middleware: unauthorized callers never reach the expensive part.

**Where it shows up in my project (file + what happened):**

`server/router.ts` — while smoke-testing the fetch adapter, a POST with invalid input returned a Zod error whose stack trace showed `inputValidatorMiddleware` running before the procedure resolver. That's what confirmed the chain order. When I add middleware later, it goes in `server/trpc.ts` (e.g. `t.middleware(...)`, then `publicProcedure.use(...)`).

**The mistake I made / bug I hit, and why it happened:**

(None yet — this came from reading the error stack trace closely instead of just noting "it failed." The stack trace _is_ the documentation for execution order.)

**Question I'd ask a candidate to test this:**

"If you attach `.input(schema)` and `.use(authMiddleware)` to a procedure, in what order do they run, and how could you find out without reading the docs?" (Answer: input validation first — it's just the first middleware; and you can see it in any error stack trace, e.g. `inputValidatorMiddleware` before `procedure`.)
