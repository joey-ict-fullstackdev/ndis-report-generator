"use client";

import { useState } from "react";
import type { Participant } from "@/lib/schema";
import type { VerifiedReport } from "@/lib/verify";
import { exportDocx, type Draft } from "@/lib/docx";

const EMPTY_PARTICIPANT: Participant = {
  name: "",
  ndis_number: "",
  plan_start: "",
  plan_end: "",
  practitioner: "",
  discipline: "Occupational Therapy",
};

// Sessions are separated by a line containing only "---".
// The first line of each block is its label (e.g. a date).
function parseNotes(raw: string) {
  return raw
    .split(/\n\s*---\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split("\n");
      const label = lines.length > 1 ? lines[0].trim() : `Session ${i + 1}`;
      const text = lines.length > 1 ? lines.slice(1).join("\n").trim() : block;
      return { id: `S${i + 1}`, label, text };
    });
}

function draftFrom(report: VerifiedReport): Draft {
  return {
    background: report.background,
    goals: report.goals.map((g) => ({
      goal_text: g.goal_text,
      status: g.status,
      summary: g.insufficient_evidence
        ? "[PRACTITIONER INPUT REQUIRED — the session notes contain no evidence for this goal]"
        : g.claims
            .map((c) =>
              c.verified ? c.text : `[PRACTITIONER TO VERIFY: ${c.text}]`
            )
            .join(" "),
    })),
    barriers: report.barriers,
    functional_capacity: report.functional_capacity,
    recommendationsText: report.recommendations
      .map(
        (r) =>
          `${r.support_category}: ${r.hours_per_week} hrs/week (${r.frequency}) — ${r.rationale}`
      )
      .join("\n"),
  };
}

export default function Home() {
  const [participant, setParticipant] = useState(EMPTY_PARTICIPANT);
  const [goalsText, setGoalsText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [report, setReport] = useState<VerifiedReport | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const field = (key: keyof Participant, label: string) => (
    <label>
      {label}
      <input
        value={participant[key]}
        onChange={(e) =>
          setParticipant({ ...participant, [key]: e.target.value })
        }
      />
    </label>
  );

  async function generate() {
    setLoading(true);
    setError("");
    setReport(null);
    setDraft(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant,
          goals: goalsText.split("\n").map((g) => g.trim()).filter(Boolean),
          notes: parseNotes(notesText),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setReport(data.report);
      setDraft(draftFrom(data.report));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    if (!draft) return;
    const blob = await exportDocx(participant, draft);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NDIS-progress-report-${participant.name || "draft"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <h1>NDIS Progress Report Generator</h1>
      <p className="tagline">
        Drafts a progress report from session notes. Every claim is verified
        against its source note — anything unsupported is flagged, not invented.
        <strong> Demo uses synthetic data only. Never paste real patient data.</strong>
      </p>

      <section className="grid">
        {field("name", "Participant name")}
        {field("ndis_number", "NDIS number")}
        {field("plan_start", "Plan start")}
        {field("plan_end", "Plan end")}
        {field("practitioner", "Practitioner")}
        {field("discipline", "Discipline")}
      </section>

      <label>
        Plan goals (one per line, exactly as written in the plan)
        <textarea
          rows={4}
          value={goalsText}
          onChange={(e) => setGoalsText(e.target.value)}
          placeholder="Improve independence with self-care tasks including showering and dressing"
        />
      </label>

      <label>
        Session notes (separate sessions with a line containing only ---; first
        line of each session is its date/label)
        <textarea
          rows={14}
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder={"2026-05-02\nClient practised showering routine with verbal prompts...\n---\n2026-05-09\nClient completed dressing task independently..."}
        />
      </label>

      <button onClick={generate} disabled={loading}>
        {loading ? "Generating…" : "Generate draft report"}
      </button>
      {error && <p className="error">{error}</p>}

      {draft && report && (
        <>
          <h2>Draft report — review and edit before export</h2>
          <label>
            Background
            <textarea
              rows={3}
              value={draft.background}
              onChange={(e) => setDraft({ ...draft, background: e.target.value })}
            />
          </label>

          {draft.goals.map((g, i) => {
            const source = report.goals[i];
            return (
              <div className="goal" key={i}>
                <h3>
                  Goal {i + 1}: {g.goal_text}
                </h3>
                <label>
                  Status
                  <input
                    value={g.status}
                    onChange={(e) => {
                      const goals = [...draft.goals];
                      goals[i] = { ...g, status: e.target.value };
                      setDraft({ ...draft, goals });
                    }}
                  />
                </label>
                <label>
                  Progress summary
                  <textarea
                    rows={4}
                    value={g.summary}
                    onChange={(e) => {
                      const goals = [...draft.goals];
                      goals[i] = { ...g, summary: e.target.value };
                      setDraft({ ...draft, goals });
                    }}
                  />
                </label>
                <details>
                  <summary>
                    Evidence trail (
                    {source.claims.filter((c) => c.verified).length}/
                    {source.claims.length} claims verified)
                  </summary>
                  {source.insufficient_evidence && (
                    <p className="flag">
                      No evidence for this goal in the session notes.
                    </p>
                  )}
                  <ul>
                    {source.claims.map((c, j) => (
                      <li key={j} className={c.verified ? "ok" : "flag"}>
                        {c.verified ? "✓" : "⚠"} {c.text}
                        <ul>
                          {c.evidence.map((e, k) => (
                            <li key={k} className={e.verified ? "ok" : "flag"}>
                              {e.note_id}: “{e.quote}”
                              {!e.verified && " — quote not found in this note"}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}

          <label>
            Barriers to progress
            <textarea
              rows={3}
              value={draft.barriers}
              onChange={(e) => setDraft({ ...draft, barriers: e.target.value })}
            />
          </label>
          <label>
            Current functional capacity
            <textarea
              rows={3}
              value={draft.functional_capacity}
              onChange={(e) =>
                setDraft({ ...draft, functional_capacity: e.target.value })
              }
            />
          </label>
          <label>
            Recommendations (one per line)
            <textarea
              rows={4}
              value={draft.recommendationsText}
              onChange={(e) =>
                setDraft({ ...draft, recommendationsText: e.target.value })
              }
            />
          </label>

          <button onClick={download}>Export DOCX</button>
        </>
      )}
    </main>
  );
}
