# <Concept name>

**One-sentence version (what I'd say first in an interview):**
To ensure that every claim in a goal of a report has evidence to support it, I wrote a verify layer to check it.
**How it works (my own words, no copy-paste):**
In a report, there are many goals, for each goal, there are many claim, and in a claim, there are many evidence must check against that claim. For each evidence, I check it against session notes to ensure every evidence of that claim exist. One claim has been approved only if all its evidence are true. Everything else untouches.
I don't use LLM for this layer because use it to check another LLM's output does not elimiate hallucination risks, it only adds another hallucination layer if there's no experts to verify its output.
**Where it shows up in my project (file + what happened):**
lib/verify.test.ts (the spec you built it against, TDD) and app/api/generate/route.ts (where the LLM's Report actually gets piped through verifyReport before reaching the client).
**The mistake I made / bug I hit, and why it happened:**

**Question I'd ask a candidate to test this:**
