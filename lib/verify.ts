import type { Report, SessionNote } from "./schema";

// The traceability engine: an LLM can cite a note it never read or "quote" text
// that isn't there. Every quote is checked against the actual note text; claims
// that don't survive are flagged for practitioner input instead of rendered as fact.

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export type VerifiedEvidence = {
  note_id: string;
  quote: string;
  verified: boolean;
};

export type VerifiedClaim = {
  text: string;
  evidence: VerifiedEvidence[];
  verified: boolean;
};

export type VerifiedReport = Omit<Report, "goals"> & {
  goals: (Omit<Report["goals"][number], "claims"> & {
    claims: VerifiedClaim[];
  })[];
};

export function verifyReport(
  report: Report,
  notes: SessionNote[]
): VerifiedReport {
  const byId = new Map(notes.map((n) => [n.id, norm(n.text)]));
  return {
    ...report,
    goals: report.goals.map((goal) => ({
      ...goal,
      claims: goal.claims.map((claim) => {
        const evidence = claim.evidence.map((e) => ({
          ...e,
          verified: byId.get(e.note_id)?.includes(norm(e.quote)) ?? false,
        }));
        return {
          text: claim.text,
          evidence,
          verified: evidence.length > 0 && evidence.every((e) => e.verified),
        };
      }),
    })),
  };
}
