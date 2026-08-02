"use client";

// The UI — deliberately a stub. The owner builds this component-by-component
// through Phase 1 of LEARNING_PLAN.md. Coach: do not write this for them.
//
// What it needs to become (see PITCH.md for the product spec):
// 1. Input form: participant fields, plan goals (one per line), session notes
//    (sessions separated by `---` lines, first line of each = date/label, IDs S1..Sn)
// 2. Generate: POST { participant, goals, notes } to /api/generate
//    (handle loading and error states — later, as ONE discriminated union)
// 3. Draft editor: editable background / per-goal status + summary / barriers /
//    functional capacity / recommendations
// 4. Evidence trail per goal: each claim with its quotes, verified ✓ vs flagged ⚠
// 5. Export: build a Draft and call exportDocx() from lib/docx.ts

export default function Home() {
  return (
    <main>
      <h1>NDIS Progress Report Generator</h1>
      <p className="tagline">
        Drafts a progress report from session notes. Every claim is verified
        against its source note — anything unsupported is flagged, not invented.
        <strong> Demo uses synthetic data only. Never paste real patient data.</strong>
      </p>
      <p>UI under construction — being built as the Phase 1 learning exercise.</p>
    </main>
  );
}
