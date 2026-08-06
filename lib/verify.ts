import type { Report, SessionNote } from "./schema";

// The traceability engine — THE core of this project, and deliberately not implemented.
//
// Contract: an LLM can cite a note it never read or "quote" text that isn't there.
// verifyReport must check every cited quote against the actual note text; claims that
// don't survive are marked unverified so the UI flags them instead of rendering as fact.
//
// TODO(owner): implement this yourself, test-driven, until `npm test` passes.
// The tests in lib/verify.test.ts define the exact behavior (including whitespace/case
// normalization). Do not let the coach write this.

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

function normalizeText(text: string): string {
  const normalized = text
    .trim()
    .replace(/ {2,}/g, " ")
    .replace(/\r?\n/g, " ")
    .toLowerCase();

  return normalized;
}

function checkEvidence(
  note: { note_id: string; quote: string },
  notes: SessionNote[],
): VerifiedEvidence[] {
  const matchingNotes = notes.filter((n) => n.id == note.note_id);

  if (matchingNotes.length == 0) {
    return [
      {
        note_id: note.note_id,
        quote: note.quote,
        verified: false,
      },
    ];
  }
  return matchingNotes.map((n) => ({
    note_id: note.note_id,
    quote: note.quote,
    verified: normalizeText(n.text).includes(normalizeText(note.quote)),
  }));
}

function checkClaim(
  checkedClaims: {
    text: string;
    evidence: { note_id: string; quote: string }[];
  }[],
  notes: SessionNote[],
): VerifiedClaim[] {
  return checkedClaims.map((claims) => {
    const evidence = claims.evidence.flatMap((e) => checkEvidence(e, notes));

    return {
      text: claims.text,
      evidence: evidence,
      verified: evidence.length > 0 && evidence.every((e) => e.verified),
    };
  });
}

export function verifyReport(
  report: Report,
  notes: SessionNote[],
): VerifiedReport {
  const verifiedGoals = report.goals.map((goal) => ({
    ...goal,
    claims: checkClaim(goal.claims, notes),
  }));

  return { ...report, goals: verifiedGoals };
}
