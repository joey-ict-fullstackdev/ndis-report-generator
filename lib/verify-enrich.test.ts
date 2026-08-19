import { expect, test } from "vitest";
import { verifyReport } from "./verify";
import { enrichReport } from "./verify-enrich";
import type { Report, SessionNote } from "./schema";

// Fixture duplicated from verify.test.ts rather than imported: reportWith()
// there isn't exported, and verify.test.ts is not to be edited.
const notes: SessionNote[] = [
  {
    id: "S1",
    label: "Session 1",
    text: "Client transferred from wheelchair to bed independently. Required verbal prompts for sequencing.",
  },
  { id: "S2", label: "Session 2", text: "Practised meal preparation using adaptive cutting board." },
];

function reportWith(evidence: { note_id: string; quote: string }[]): Report {
  return {
    background: "",
    barriers: "",
    functional_capacity: "",
    recommendations: [],
    goals: [
      {
        goal_text: "Goal A",
        status: "On track",
        insufficient_evidence: false,
        claims: [{ text: "Some claim.", evidence }],
      },
    ],
  };
}

function multiGoalReport(
  goals: {
    claims: { text: string; evidence: { note_id: string; quote: string }[] }[];
  }[],
): Report {
  return {
    background: "",
    barriers: "",
    functional_capacity: "",
    recommendations: [],
    goals: goals.map((g, i) => ({
      goal_text: `Goal ${i + 1}`,
      status: "On track",
      insufficient_evidence: false,
      claims: g.claims,
    })),
  };
}

const enrichedEvidenceOf = (r: Report) => {
  const verified = verifyReport(r, notes);
  const enriched = enrichReport(verified, notes);
  return enriched.goals[0].claims[0].evidence[0];
};

test("exact byte-for-byte quote gets match_type exact with a correct location", () => {
  const quote = "transferred from wheelchair to bed independently";
  const evidence = enrichedEvidenceOf(reportWith([{ note_id: "S1", quote }]));

  const note = notes[0];
  const expectedStart = note.text.indexOf(quote);

  expect(evidence.match_type).toBe("exact");
  expect(evidence.location).toEqual({
    start: expectedStart,
    end: expectedStart + quote.length,
  });
});

test("quote that only matches after normalization is exact but has no location", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "Transferred  from wheelchair\nto bed Independently" }]),
  );

  expect(evidence.match_type).toBe("exact");
  expect(evidence.location).toBeNull();
});

test("fabricated quote is not_found with no location", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "client walked 500m unaided" }]),
  );

  expect(evidence.match_type).toBe("not_found");
  expect(evidence.location).toBeNull();
});

test("real quote attributed to the wrong note is not_found for that note", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S2", quote: "transferred from wheelchair to bed independently" }]),
  );

  expect(evidence.match_type).toBe("not_found");
  expect(evidence.location).toBeNull();
});

test("unknown note id is not_found with no location", () => {
  const evidence = enrichedEvidenceOf(reportWith([{ note_id: "S99", quote: "anything" }]));

  expect(evidence.match_type).toBe("not_found");
  expect(evidence.location).toBeNull();
});

test("enrichment never changes the inherited verified value", () => {
  const goodEvidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "transferred from wheelchair to bed independently" }]),
  );
  expect(goodEvidence.verified).toBe(true);

  const badEvidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "fabricated text" }]),
  );
  expect(badEvidence.verified).toBe(false);
});

test("evidence cited only once anywhere is not flagged duplicate", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "transferred from wheelchair to bed independently" }]),
  );
  expect(evidence.duplicate).toBe(false);
});

test("same evidence cited by two claims in the same goal is flagged duplicate", () => {
  const quote = "transferred from wheelchair to bed independently";
  const report = multiGoalReport([
    {
      claims: [
        { text: "Claim A", evidence: [{ note_id: "S1", quote }] },
        { text: "Claim B", evidence: [{ note_id: "S1", quote }] },
      ],
    },
  ]);

  const enriched = enrichReport(verifyReport(report, notes), notes);

  expect(enriched.goals[0].claims[0].evidence[0].duplicate).toBe(true);
  expect(enriched.goals[0].claims[1].evidence[0].duplicate).toBe(true);
});

test("same evidence cited across two different goals is flagged duplicate", () => {
  const quote = "transferred from wheelchair to bed independently";
  const report = multiGoalReport([
    { claims: [{ text: "Claim A", evidence: [{ note_id: "S1", quote }] }] },
    { claims: [{ text: "Claim B", evidence: [{ note_id: "S1", quote }] }] },
  ]);

  const enriched = enrichReport(verifyReport(report, notes), notes);

  expect(enriched.goals[0].claims[0].evidence[0].duplicate).toBe(true);
  expect(enriched.goals[1].claims[0].evidence[0].duplicate).toBe(true);
});

test("same quote text cited against different note_ids is not flagged duplicate", () => {
  const report = multiGoalReport([
    {
      claims: [
        { text: "Claim A", evidence: [{ note_id: "S1", quote: "same wording" }] },
        { text: "Claim B", evidence: [{ note_id: "S2", quote: "same wording" }] },
      ],
    },
  ]);

  const enriched = enrichReport(verifyReport(report, notes), notes);

  expect(enriched.goals[0].claims[0].evidence[0].duplicate).toBe(false);
  expect(enriched.goals[0].claims[1].evidence[0].duplicate).toBe(false);
});

test("identical evidence cited twice within the same claim is flagged duplicate", () => {
  const quote = "transferred from wheelchair to bed independently";
  const report = reportWith([
    { note_id: "S1", quote },
    { note_id: "S1", quote },
  ]);

  const enriched = enrichReport(verifyReport(report, notes), notes);
  const [first, second] = enriched.goals[0].claims[0].evidence;

  expect(first.duplicate).toBe(true);
  expect(second.duplicate).toBe(true);
});

test("duplicate evidence does not affect claim.verified", () => {
  const quote = "transferred from wheelchair to bed independently";
  const report = reportWith([
    { note_id: "S1", quote },
    { note_id: "S1", quote },
  ]);

  const enriched = enrichReport(verifyReport(report, notes), notes);

  expect(enriched.goals[0].claims[0].verified).toBe(true);
});

test("reworded quote with high word-overlap against the cited note is flagged paraphrased", () => {
  // Same distinct words as S1's opening clause, reordered — not a literal or
  // normalized substring, but every word is really in the note.
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently transferred wheelchair bed client" }]),
  );

  expect(evidence.match_type).toBe("paraphrased");
  expect(evidence.location).toBeNull();
  expect(evidence.verified).toBe(false);
});

test("quote below the overlap threshold stays not_found", () => {
  // Only 3 of 5 distinct words ("rocket", "ship" aren't in S1) — below the
  // 0.8 overlap threshold, so the heuristic must not fire.
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently transferred rocket ship client" }]),
  );

  expect(evidence.match_type).toBe("not_found");
});

test("very short quote does not trigger the paraphrase heuristic even with full overlap", () => {
  // Only 2 distinct words, both present in S1 — would score 100% overlap,
  // but is below PARAPHRASE_MIN_QUOTE_WORDS, so it must fall through.
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently client" }]),
  );

  expect(evidence.match_type).toBe("not_found");
});

test("paraphrase-similar wording is scoped to the cited note, not any note", () => {
  // These words paraphrase S2's text well, but are cited against S1 — must
  // not match against a note other than the one actually cited.
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "cutting board adaptive meal preparation" }]),
  );

  expect(evidence.match_type).toBe("not_found");
});

test("a paraphrase never counts as verified, even though it is flagged", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently transferred wheelchair bed client" }]),
  );

  expect(evidence.match_type).toBe("paraphrased");
  expect(evidence.verified).toBe(false);
});
