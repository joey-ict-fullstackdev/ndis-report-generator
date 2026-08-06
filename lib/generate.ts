import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  ReportSchema,
  type Participant,
  type Report,
  type SessionNote,
} from "./schema";
import { config } from "dotenv";

config({ path: ".env.local" });

const SYSTEM = `You draft NDIS progress reports for allied health practitioners. The draft will be reviewed and edited by the treating practitioner before submission.

Rules — these are non-negotiable:
- Every claim about the participant must be supported by the session notes. Each claim cites the note it comes from with a VERBATIM quote: copy the characters exactly as they appear in the note. Do not paraphrase inside a quote.
- Copy each plan goal into goal_text exactly as it was given, character for character.
- If the session notes contain no evidence about a goal, set insufficient_evidence to true and leave its claims empty. Never infer or invent progress.
- Use objective, measurable clinical language (frequency, duration, level of assistance). No promotional adjectives.
- Recommendations must be quantified: hours, frequency, NDIS support category, and a clinical rationale tied to the goals.

Output format:
Produce one report with exactly these fields.
- background: 2-4 sentences on presenting condition and service history, drawn only from the notes.
- goals: one entry per plan goal, in the same order as given, each with:
  - goal_text: the goal copied verbatim from the input
  - status: exactly one of "Achieved" | "On track" | "Modified" | "Not yet commenced" | "Discontinued"
  - claims: array of { text, evidence: [{ note_id, quote }] }. Every claim needs at least one evidence item with a verbatim quote. Leave this array empty only when insufficient_evidence is true.
  - insufficient_evidence: true only when the notes contain nothing at all about this goal
- barriers: factors from the notes slowing progress (fatigue, cognitive load, access issues, waitlists, etc.) — omit anything not evidenced in the notes
- functional_capacity: current capacity in measurable terms (assistance level, distance, duration, frequency)
- recommendations: array of { support_category, hours_per_week, frequency, rationale }, each rationale tied to a specific goal or barrier above

Worked examples — one per goal status, plus the zero-evidence case, showing how a claim is built from a note:

Example — status "Achieved":
Note S4: "Client independently prepared a two-course meal without prompts, third session in a row."
Goal: "I want to prepare my own meals"
-> goal_text: "I want to prepare my own meals", status: "Achieved", insufficient_evidence: false, claims: [{ text: "Client independently prepares meals without prompts, consistent across three consecutive sessions.", evidence: [{ note_id: "S4", quote: "independently prepared a two-course meal without prompts, third session in a row" }] }]

Example — status "On track":
Note S2: "Client mobilised 40 metres with four-wheeled walker, one rest break, improved from 25 metres last session."
Goal: "I want to walk to the letterbox unaided"
-> goal_text: "I want to walk to the letterbox unaided", status: "On track", insufficient_evidence: false, claims: [{ text: "Client's walking distance with a four-wheeled walker increased from 25 to 40 metres between sessions, with one rest break required.", evidence: [{ note_id: "S2", quote: "mobilised 40 metres with four-wheeled walker, one rest break, improved from 25 metres last session" }] }]

Example — status "Modified":
Note S3: "Original goal of returning to driving discussed; client and OT agreed to focus on community access via mobility scooter instead, due to ongoing visual field deficit."
Goal: "I want to return to driving"
-> goal_text: "I want to return to driving", status: "Modified", insufficient_evidence: false, claims: [{ text: "Following discussion of an ongoing visual field deficit, the goal was adjusted from independent driving to community access via mobility scooter.", evidence: [{ note_id: "S3", quote: "agreed to focus on community access via mobility scooter instead, due to ongoing visual field deficit" }] }]

Example — status "Not yet commenced":
Note S1: "Home modifications assessment requested but not yet scheduled; bathroom access remains unchanged."
Goal: "I want to shower independently in my own bathroom"
-> goal_text: "I want to shower independently in my own bathroom", status: "Not yet commenced", insufficient_evidence: false, claims: [{ text: "A home modifications assessment has been requested but not yet scheduled, and bathroom access is unchanged from the start of the plan period.", evidence: [{ note_id: "S1", quote: "Home modifications assessment requested but not yet scheduled; bathroom access remains unchanged" }] }]

Example — status "Discontinued":
Note S5: "Client and family decided to discontinue the return-to-work goal after accepting Disability Support Pension; no further sessions targeting this goal."
Goal: "I want to return to my previous job"
-> goal_text: "I want to return to my previous job", status: "Discontinued", insufficient_evidence: false, claims: [{ text: "The client and family elected to discontinue this goal after the client accepted the Disability Support Pension.", evidence: [{ note_id: "S5", quote: "decided to discontinue the return-to-work goal after accepting Disability Support Pension" }] }]

Example — insufficient evidence (no note mentions the goal at all):
Notes cover showering and meal preparation only; none mention swimming.
Goal: "I want to return to swimming at my local pool"
-> goal_text: "I want to return to swimming at my local pool", status: "Not yet commenced", insufficient_evidence: true, claims: []
Do not invent a claim just to fill this in — insufficient_evidence: true with an empty claims array is the correct, complete answer whenever a goal has zero coverage in the notes.`;

export async function generateReport(
  participant: Participant,
  goals: string[],
  notes: SessionNote[],
): Promise<{ report: Report; usage: Anthropic.Usage }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }

  const client = new Anthropic({ apiKey });

  const notesBlock = notes
    .map((n) => `<note id="${n.id}" label="${n.label}">\n${n.text}\n</note>`)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Participant details:
${JSON.stringify(participant, null, 2)}

Plan goals:
${goals.map((g, i) => `${i + 1}. ${g}`).join("\n")}

Session notes:
${notesBlock}

Draft the progress report.`,
      },
    ],
    output_config: { format: zodOutputFormat(ReportSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Generation failed (stop_reason: ${response.stop_reason})`);
  }
  return { report: response.parsed_output, usage: response.usage };
}
