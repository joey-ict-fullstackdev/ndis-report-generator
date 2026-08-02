import test from "node:test";
import assert from "node:assert/strict";
import { verifyReport } from "./verify";
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
  assert.equal(claim.verified, true);
});

test("quote matching is case- and whitespace-insensitive", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S1", quote: "Transferred  from wheelchair\nto bed Independently" }])
  );
  assert.equal(claim.verified, true);
});

test("fabricated quote is rejected", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S1", quote: "client walked 500m unaided" }])
  );
  assert.equal(claim.verified, false);
  assert.equal(claim.evidence[0].verified, false);
});

test("real quote attributed to the wrong note is rejected", () => {
  const claim = claimOf(
    reportWith([{ note_id: "S2", quote: "transferred from wheelchair to bed independently" }])
  );
  assert.equal(claim.verified, false);
});

test("unknown note id is rejected", () => {
  const claim = claimOf(reportWith([{ note_id: "S99", quote: "anything" }]));
  assert.equal(claim.verified, false);
});

test("claim with no evidence is not verified", () => {
  const claim = claimOf(reportWith([]));
  assert.equal(claim.verified, false);
});

test("one bad quote among good ones fails the claim", () => {
  const claim = claimOf(
    reportWith([
      { note_id: "S1", quote: "transferred from wheelchair to bed" },
      { note_id: "S1", quote: "this text does not exist" },
    ])
  );
  assert.equal(claim.verified, false);
  assert.equal(claim.evidence[0].verified, true);
  assert.equal(claim.evidence[1].verified, false);
});
