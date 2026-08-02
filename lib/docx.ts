import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { Participant } from "./schema";

export type Draft = {
  background: string;
  goals: { goal_text: string; status: string; summary: string }[];
  barriers: string;
  functional_capacity: string;
  recommendationsText: string;
};

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
