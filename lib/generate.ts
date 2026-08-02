import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  ReportSchema,
  type Participant,
  type Report,
  type SessionNote,
} from "./schema";

const SYSTEM = `You draft NDIS progress reports for allied health practitioners. The draft will be reviewed and edited by the treating practitioner before submission.

Rules — these are non-negotiable:
- Every claim about the participant must be supported by the session notes. Each claim cites the note it comes from with a VERBATIM quote: copy the characters exactly as they appear in the note. Do not paraphrase inside a quote.
- Copy each plan goal into goal_text exactly as it was given, character for character.
- If the session notes contain no evidence about a goal, set insufficient_evidence to true and leave its claims empty. Never infer or invent progress.
- Use objective, measurable clinical language (frequency, duration, level of assistance). No promotional adjectives.
- Recommendations must be quantified: hours, frequency, NDIS support category, and a clinical rationale tied to the goals.`;

export async function generateReport(
  participant: Participant,
  goals: string[],
  notes: SessionNote[]
): Promise<{ report: Report; usage: Anthropic.Usage }> {
  const client = new Anthropic();

  const notesBlock = notes
    .map((n) => `<note id="${n.id}" label="${n.label}">\n${n.text}\n</note>`)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-5",
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
    output_config: { format: zodOutputFormat(ReportSchema, "ndis_report") },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Generation failed (stop_reason: ${response.stop_reason})`);
  }
  return { report: response.parsed_output, usage: response.usage };
}
