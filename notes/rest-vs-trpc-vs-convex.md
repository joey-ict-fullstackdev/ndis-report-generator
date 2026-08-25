# REST vs tRPC vs Convex

**One-sentence version (what I'd say first in an interview):**

They differ in _where_ the type-safety guarantee comes from and _what_ you're coupled to: REST gives you neither guarantee by default, tRPC gets you both using the TypeScript compiler you already have (at the cost of client and server sharing a TS codebase), and Convex gets you both by _being_ your backend — runtime, database, and hosting as a package deal.

**How it works (my own words, no copy-paste):**

Two guarantees people conflate, delivered from two different sources:

1. **Compile-time inference** — tRPC's `export type AppRouter = typeof appRouter` is a pure TS type. It's erased at build, costs zero bytes, and `tsc` checks every client call site against it. Rename a field on the server and every client usage fails to compile. (This is what caught the `__name` rename across all my call sites.)
2. **Runtime validation** — the `.input(ParticipantSchema)` Zod call. This guards the boundary against callers that never went through `tsc` at all: `curl`, a bug, a malicious request. Compile-time types can't help you there — they're gone at runtime.

Now the three options:

- **REST** gives you neither out of the box. `res.json(): any` swallowed that same rename silently. Hand-written types on both sides drift because nothing ties them together. REST + OpenAPI codegen gets closer to both guarantees, but you pay for it with a codegen step you must run and keep in sync — a build-time coupling tRPC skips by just using the compiler that's already there.
- **tRPC**'s coupling is narrow: client code must be able to `import type { AppRouter }` from server code. Same repo (or a published types-only package). It says nothing about database, hosting, or runtime — Postgres+Drizzle and a move to AWS App Runner are both still compatible without touching the tRPC layer.
- **Convex** couples the other direction: not "add type safety to my server" but "let Convex _be_ my server." Functions live in `convex/`, run on Convex's runtime, against Convex's document database, deployed to Convex's cloud. You get type safety plus live subscriptions for free — but runtime, DB, and hosting are all theirs now, as a package.

**Where it shows up in my project (file + what happened):**

tRPC's adoption cost here was literally _swap one route handler_: three small files (`server/trpc.ts`, `server/router.ts`, one fetch adapter) plus a provider — and the old REST handler still sits untouched in `app/api/generate/route.ts` for comparison. Convex would have fought two deliberate design decisions:

- **"No database in v1"** is the privacy story — stateless on purpose. Convex's whole value proposition is its reactive database; adopting it for type safety while not using its database means paying for a platform you're not using for the reason it exists.
- **The Anthropic key stays in one place.** Convex adds a second deploy target and a second place a secret lives — platform-operating overhead for a portfolio project whose point (per `PITCH.md`) is demonstrating I understand the _mechanism_, not that I can run a vendor's platform.

Interview relevance too: the gap this learning plan exists to close was named by the interviewer as "tRPC / end-to-end type-safe patterns." The lesson — type inference and erasure across a boundary you own — generalizes to gRPC/protobuf-shaped thinking anywhere. "I know Convex's SDK" doesn't.

**The mistake I made / bug I hit, and why it happened:**

The conceptual mistake to avoid: treating compile-time types as if they also protect you at runtime. They don't — `AppRouter` is erased. A malformed `curl` request sails past every type annotation and only stops at the Zod `.input()` schema. Both layers exist because they catch different attackers: the compiler catches _my_ mistakes, Zod catches _everyone else's_ requests.

**What you give up with tRPC — say it out loud:**

The contract is a TypeScript type with no independent existence outside `tsc` — no `.proto`, no OpenAPI YAML. A Swift/Kotlin/Python client (mobile app, third-party integrator — exactly the partners Splose/Personify-style platforms deal with) gets zero benefit and nothing to generate a client from. They'd need a separate REST/OpenAPI or GraphQL surface _alongside_ tRPC, or bolt on something like `trpc-openapi`. `PITCH.md`'s v1 scope (one TS client, one TS server, no integrations) makes this a non-issue today, but the honest answer to "what about a mobile app later" is "tRPC's safety is scoped to TS-to-TS; a non-TS consumer gets its own REST/GraphQL layer, not tRPC everywhere" — not "tRPC handles that too."

**Question I'd ask a candidate to test this:**

"tRPC claims end-to-end type safety with no codegen step. Where exactly does that guarantee come from, what does it cost you, and what happens when a client that isn't TypeScript needs to call your API?"
