# Progress notes vs progress reports (NDIS domain)

**One-sentence version (what I'd say first in an interview):**
A progress note is what a clinician writes after one session; a progress report is the plan-review document synthesised from months of notes to justify continued funding — my project generates the report from the notes.

**How it works (my own words, no copy-paste):**
Notes are per-session capture: what happened, what assistance was needed, measurable observations. Reports are cross-session synthesis: goal-by-goal progress status, barriers, functional capacity, and quantified support recommendations, in the structure the NDIA expects at plan review. Funding decisions ride on the report, not the notes.

**Where it shows up in my project (file + what happened):**
Notes are the input (`SessionNote[]` parsed from the textarea, IDs S1..Sn); the report is the output (`ReportSchema` in `lib/schema.ts`). The whole pipeline is note-to-report synthesis, and `lib/verify.ts` exists because synthesis is where hallucination risk concentrates — the model aggregates across months of material instead of transcribing one session, so every claim must trace back to a verbatim quote in a specific note or it gets flagged.

**The mistake I made / bug I hit, and why it happened:**
Early on I lumped "AI report writing" and "AI note writing" together when scanning competitors. They're different features: several platforms (e.g. Lumary) ship AI-assisted note-*writing*; fewer do verified note-to-report *synthesis*. Blurring them nearly made me misjudge the competitive landscape.

**Question I'd ask a candidate to test this:**
"Lumary already has an AI feature that helps write progress notes — so what does your project add?" (Answer: notes are capture, reports are synthesis with funding consequences; synthesis concentrates hallucination risk; my verification engine means no claim reaches the report unless its quoted source exists in the notes. And phrase competitor claims carefully: "your public materials describe X," never "you don't have Y.")
