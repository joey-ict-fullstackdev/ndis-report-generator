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

export function verifyReport(
  report: Report,
  notes: SessionNote[]
): VerifiedReport {
  throw new Error(
    "Not implemented — this is the owner's exercise. Make lib/verify.test.ts pass."
  );
}
