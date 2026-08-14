# Race conditions: state vs. intent

**One-sentence version (what I'd say first in an interview):**

<!-- One sentence. If it takes two, you don't have it yet. -->
Reconciliation keeps the DOM sync with state, the race-condition guard keeps state in sync with intent, and both break when something reads or writes across that boundary at the wrong time (stale closure reading old state, stale fetch writing new state)

**How it works (my own words, no copy-paste):**
If a stale clousure reads the DOM/state before the Commit, you get a UI bug. If a slow network fetch writes to State after the Commit, you get a data bug.

**Where it shows up in my project (file + what happened):**

<!-- Which file, which handler, what specifically goes wrong on a double-click? -->


**The mistake I made / bug I hit, and why it happened:**

<!-- The stale-closure guard hole. Also: why doesn't AbortController refund tokens? -->

**Question I'd ask a candidate to test this:**

<!-- Write one you'd actually ask. -->
