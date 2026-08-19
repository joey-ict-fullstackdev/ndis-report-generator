import type { SessionNote } from "./schema";
import type { VerifiedClaim, VerifiedEvidence, VerifiedReport } from "./verify";

// Wraps the output of verifyReport() with additional, purely additive signal.
// Does not import or modify anything in verify.ts beyond its exported types —
// verify.ts is owner-owned, TDD'd code and stays frozen. See LEARNING_PLAN.md /
// the "adaptive-swinging-lynx" plan for why this lives in its own file.

export type EvidenceLocation = { start: number; end: number };

export type MatchType = "exact" | "paraphrased" | "not_found";

export type EnrichedEvidence = VerifiedEvidence & {
  match_type: MatchType;
  location: EvidenceLocation | null;
  duplicate: boolean;
};

export type EnrichedClaim = Omit<VerifiedClaim, "evidence"> & {
  evidence: EnrichedEvidence[];
};

export type EnrichedReport = Omit<VerifiedReport, "goals"> & {
  goals: (Omit<VerifiedReport["goals"][number], "claims"> & {
    claims: EnrichedClaim[];
  })[];
};

// Duplicated from verify.ts rather than imported: normalizeText there is not
// exported, and verify.ts is not to be edited (not even to add `export`).
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/ {2,}/g, " ")
    .replace(/\r?\n/g, " ")
    .toLowerCase();
}

// Minimum distinct words a quote needs before the paraphrase heuristic will
// even consider it, and the fraction of those words that must appear
// somewhere in the cited note's text to count as a paraphrase. Kept
// conservative on purpose: short/common quotes ("bed independently") can
// trivially "overlap" with unrelated text, and this signal must never be
// mistaken for verification (see the policy note on isParaphraseMatch).
const PARAPHRASE_MIN_QUOTE_WORDS = 4;
const PARAPHRASE_OVERLAP_THRESHOLD = 0.8;

function wordsOf(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 0);
}

// Hand-rolled word-overlap check (no fuzzy-match/diff library — verify-enrich.ts
// stays dependency-free like verify.ts). Only meaningful once classifyMatch has
// already ruled out an exact match; scoped to whichever single note's text the
// caller passes in, so a paraphrase-similar passage in a *different* note never
// counts (mirrors the existing "wrong note_id" rule in verify.ts).
export function isParaphraseMatch(quote: string, noteText: string): boolean {
  const quoteWords = new Set(wordsOf(quote));
  if (quoteWords.size < PARAPHRASE_MIN_QUOTE_WORDS) {
    return false;
  }

  const noteWords = new Set(wordsOf(noteText));
  const matched = [...quoteWords].filter((w) => noteWords.has(w)).length;

  return matched / quoteWords.size >= PARAPHRASE_OVERLAP_THRESHOLD;
}

export function classifyMatch(
  quote: string,
  noteText: string,
): { match_type: MatchType; location: EvidenceLocation | null } {
  const literalIndex = noteText.indexOf(quote);
  if (literalIndex !== -1) {
    return {
      match_type: "exact",
      location: { start: literalIndex, end: literalIndex + quote.length },
    };
  }

  if (normalizeText(noteText).includes(normalizeText(quote))) {
    return { match_type: "exact", location: null };
  }

  if (isParaphraseMatch(quote, noteText)) {
    return { match_type: "paraphrased", location: null };
  }

  return { match_type: "not_found", location: null };
}

export function enrichEvidence(
  evidence: VerifiedEvidence,
  notes: SessionNote[],
): EnrichedEvidence {
  const note = notes.find((n) => n.id === evidence.note_id);

  if (!note) {
    return { ...evidence, match_type: "not_found", location: null, duplicate: false };
  }

  const { match_type, location } = classifyMatch(evidence.quote, note.text);
  return { ...evidence, match_type, location, duplicate: false };
}

// Normalized enough to catch whitespace/case-only variants of the same
// citation without pulling in normalizeText's regex-based normalization
// (that's about matching a quote against note text, not comparing two
// quotes to each other — a plain lowercase+trim is the right amount here).
function evidenceKey(e: { note_id: string; quote: string }): string {
  return `${e.note_id}::${e.quote.trim().toLowerCase()}`;
}

export function enrichReport(
  report: VerifiedReport,
  notes: SessionNote[],
): EnrichedReport {
  const enrichedGoals = report.goals.map((goal) => ({
    ...goal,
    claims: goal.claims.map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((e) => enrichEvidence(e, notes)),
    })),
  }));

  // Second, whole-report pass: count how many times each (note_id, quote)
  // pair is cited anywhere in the report, then flag every occurrence past
  // the first as a duplicate. Deliberately whole-report scope, not scoped
  // to a single claim or goal — a quote reused across two different goals
  // is still evidence padding, not independent corroboration.
  const counts = new Map<string, number>();
  for (const goal of enrichedGoals) {
    for (const claim of goal.claims) {
      for (const e of claim.evidence) {
        const key = evidenceKey(e);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const dedupedGoals = enrichedGoals.map((goal) => ({
    ...goal,
    claims: goal.claims.map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((e) => ({
        ...e,
        duplicate: (counts.get(evidenceKey(e)) ?? 0) > 1,
      })),
    })),
  }));

  return { ...report, goals: dedupedGoals };
}
