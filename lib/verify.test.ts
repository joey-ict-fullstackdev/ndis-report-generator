import { expect, test } from "vitest";
import { verifyReport, enrichReport } from "./verify";
import type { Report, SessionNote } from "./schema";

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

const claimOf = (r: Report) => verifyReport(r, notes).goals[0].claims[0];

test("exact quote from the cited note is verified", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S1", quote: "transferred from wheelchair to bed independently" }])
  );
  expect(claim.verified).toBe(true);
});

test("quote matching is case- and whitespace-insensitive", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S1", quote: "Transferred  from wheelchair\nto bed Independently" }])
  );
  expect(claim.verified).toBe(true);
});

test("fabricated quote is rejected", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S1", quote: "client walked 500m unaided" }])
  );
  expect(claim.verified).toBe(false);
  expect(claim.evidence[0].verified).toBe(false);
});

test("real quote attributed to the wrong note is rejected", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S2", quote: "transferred from wheelchair to bed independently" }])
  );
  expect(claim.verified).toBe(false);
});

test("unknown note id is rejected", () => {
  const claim = claimOf(reportWith([{ note_id: "S99", quote: "anything" }]));
  expect(claim.verified).toBe(false);
});

test("claim with no evidence is not verified", () => {
  const claim = claimOf(reportWith([]));
  expect(claim.verified).toBe(false);
});

test("one bad quote among good ones fails the claim", () => {
  const claim = claimOf(
    reportWith([
      { note_id: "S1", quote: "transferred from wheelchair to bed" },
      { note_id: "S1", quote: "this text does not exist" },
    ])
  );
  expect(claim.verified).toBe(false);
  expect(claim.evidence[0].verified).toBe(true);
  expect(claim.evidence[1].verified).toBe(false);
});

// ---------------------------------------------------------------------------
// Merged in from lib/verify-enrich.test.ts (now deleted, alongside
// lib/verify-enrich.ts — both moved into verify.ts / verify.test.ts). Reuses
// the `notes` and `reportWith` fixtures above instead of re-declaring the
// identical copies verify-enrich.test.ts used to carry (it couldn't share
// them across files before; now it's the same file). Nothing above this
// line was changed.
// ---------------------------------------------------------------------------

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
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently transferred wheelchair bed client" }]),
  );

  expect(evidence.match_type).toBe("paraphrased");
  expect(evidence.location).toBeNull();
  expect(evidence.verified).toBe(false);
});

test("quote below the overlap threshold stays not_found", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently transferred rocket ship client" }]),
  );

  expect(evidence.match_type).toBe("not_found");
});

test("very short quote does not trigger the paraphrase heuristic even with full overlap", () => {
  const evidence = enrichedEvidenceOf(
    reportWith([{ note_id: "S1", quote: "independently client" }]),
  );

  expect(evidence.match_type).toBe("not_found");
});

test("paraphrase-similar wording is scoped to the cited note, not any note", () => {
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
