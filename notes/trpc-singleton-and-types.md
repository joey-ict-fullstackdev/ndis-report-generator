# tRPC: singleton instance, type erasure & schema placement

**One-sentence version (what I'd say first in an interview):**

`initTRPC.create()` is a singleton factory — call it once so context, procedures, and middleware share one contract; and tRPC's "no codegen" works because `export type AppRouter = typeof appRouter` is erased at compile time, giving the client full type safety with zero runtime cost.

---

## 1. Why one `initTRPC.create()`?

**How it works (my own words):**

`initTRPC.create()` isn't just a helper — it's the _factory_ that stamps out `router`, `procedure`, and `middleware`. If I called it again in `router.ts`, I'd get a second, independent tRPC world. Two things go wrong:

1. **Composition breaks at compile time.** Middleware built against instance A's context type can't attach to procedures from instance B. `mergeRouters` across two different builders fails — TypeScript sees two structurally-different generic instantiations (even if identically shaped) and refuses to compose them.
2. **Context stops being a shared contract.** `initTRPC.create()` is where I'll eventually call `.context<Context>()` to declare what `createContext()` returns (right now it's `createContext: () => ({})` in the adapter — a placeholder). Every procedure and middleware must agree on **one** Context type so an auth middleware can stash `session` on context and every downstream resolver knows it's there. One `t` instance is what makes context a shared contract across the whole router tree — that's the Phase 4 auth story foreshadowed by the empty object.

**Where it shows up in my project:** `server/trpc.ts` creates `t` once and exports `router`/`publicProcedure`; `server/router.ts` imports them. The empty `createContext: () => ({})` in `app/api/trpc/[trpc]/route.ts` is the placeholder where a typed context (auth session, DB) will plug in during Phase 4.

---

## 2. `export type AppRouter = typeof appRouter` — what happens at compile time?

**How it works (my own words):**

That line **vanishes completely** in the emitted JS. TypeScript types are erased during compilation — `typeof appRouter` is evaluated at compile time, not runtime. The JS bundle contains only the `appRouter` value; the `AppRouter` type lives only in the type-checker and `.d.ts` files.

**Why this is the "no codegen" pitch:**

GraphQL/OpenAPI need a _schema file_ (SDL/JSON) plus a code generator that emits client types. tRPC has **no schema file** — the client imports `AppRouter` directly as a TypeScript type. Because types are erased, importing it costs **zero bytes** in the client bundle, yet TypeScript validates every procedure call, input shape, and response type. The type system itself _is_ the contract — no generated intermediate layer, full IntelliSense, zero runtime overhead.

---

## 3. Why the router's input schema stays inline instead of `lib/schema.ts`

**How it works (my own words):**

Deliberate call. The distinction is **domain entity** vs **API transport wrapper**:

- **`lib/schema.ts` = business nouns.** `Participant`, `SessionNote`, `Report`, `Claim` — things the business _is_, used by multiple consumers (LLM prompt, verifier, DOCX exporter, evals). Changing one is a domain change.
- **Router input = transport glue.** `{ participant, goals, notes }` is just "the arguments this one endpoint takes" — a tuple in object clothing. It exists only to get data across the wire to `generateReport`. Nobody else needs it; it'd bloat the source of truth with one-off shapes.

**Heuristic:** schemas for _what the business is_ → `schema.ts`. Schemas for _how to call a function_ → inline at the call site.

---

**The mistake I made / bug I hit, and why it happened:**

(None — these were design decisions verified by typecheck and curl smoke tests. The trap to avoid: assuming "single source of truth" means _every_ Zod schema goes in one file. It means domain truth lives in one file.)

**Question I'd ask a candidate to test this:**

1. "What breaks if you call `initTRPC.create()` twice?" (Not just 'type error' — context stops being a shared contract; middleware/procedures from different instances can't compose.)
2. "What does `export type AppRouter` compile to in the JS bundle?" (Nothing — type erasure. And that's exactly why tRPC needs no codegen.)
3. "Why keep the procedure input schema out of your shared schema file?" (It's a transport envelope, not a domain entity.)
