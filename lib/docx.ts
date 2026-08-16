import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { Participant } from "./schema";
import type { VerifiedReport } from "./verify";

export type Draft = {
  background: string;
  goals: { goal_text: string; status: string; summary: string }[];
  barriers: string;
  functional_capacity: string;
  recommendationsText: string;
};

export function toDraft(report: VerifiedReport): Draft {
  return {
    background: report.background,
    goals: report.goals.map((goal) => {
      const verifiedClaims = goal.claims.filter((c) => c.verified);

      const summary =
        goal.insufficient_evidence || verifiedClaims.length === 0
          ? "No verified progress recorded for this goal."
          : verifiedClaims.map((c) => c.text).join(" ");

      return { goal_text: goal.goal_text, status: goal.status, summary };
    }),
    barriers: report.barriers,
    functional_capacity: report.functional_capacity,
    recommendationsText: report.recommendations
      .map(
        (r) =>
          `${r.support_category}: ${r.hours_per_week} hrs/week, ${r.frequency} — ${r.rationale}`,
      )
      .join("\n"),
  };
}

const h = (text: string) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
const p = (text: string) =>
  new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } });

export async function exportDocx(
  participant: Participant,
  draft: Draft
): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "NDIS Progress Report", heading: HeadingLevel.HEADING_1 }),
          p(`Participant: ${participant.name}   NDIS number: ${participant.ndis_number}`),
          p(`Plan period: ${participant.plan_start} to ${participant.plan_end}`),
          p(`Practitioner: ${participant.practitioner} (${participant.discipline})`),
          h("Background"),
          p(draft.background),
          ...draft.goals.flatMap((g, i) => [
            h(`Goal ${i + 1}: ${g.goal_text}`),
            p(`Status: ${g.status}`),
            p(g.summary),
          ]),
          h("Barriers to progress"),
          p(draft.barriers),
          h("Current functional capacity"),
          p(draft.functional_capacity),
          h("Recommendations for next plan period"),
          ...draft.recommendationsText.split("\n").filter(Boolean).map(p),
          h("Practitioner declaration"),
          p(
            `I, ${participant.practitioner}, declare that the information in this report is true and correct to the best of my knowledge.`
          ),
          p("Signature: ______________________    Date: ____________"),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
