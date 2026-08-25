import { z } from "zod";

export const GOAL_STATUSES = [
  "Achieved",
  "On track",
  "Modified",
  "Not yet commenced",
  "Discontinued",
] as const;

export const EvidenceSchema = z.object({
  note_id: z
    .string()
    .describe("ID of the session note this quote comes from, e.g. S1"),
  quote: z
    .string()
    .describe(
      "Verbatim quote copied character-for-character from that session note",
    ),
});

export const ClaimSchema = z.object({
  text: z
    .string()
    .describe(
      "One factual sentence about progress, in objective clinical language",
    ),
  evidence: z
    .array(EvidenceSchema)
    .describe(
      "Citations supporting this claim. Every claim needs at least one; never cite a note that does not contain the quote",
    ),
});

export const GoalReportSchema = z.object({
  goal_text: z
    .string()
    .describe("The plan goal, copied exactly as provided in the input"),
  status: z.enum(GOAL_STATUSES),
  claims: z.array(ClaimSchema),
  insufficient_evidence: z
    .boolean()
    .describe(
      "True when the session notes contain no evidence about this goal. When true, claims must be empty",
    ),
});

export const ReportSchema = z.object({
  background: z
    .string()
    .describe("Brief background: presenting condition, service history"),
  goals: z.array(GoalReportSchema),
  barriers: z
    .string()
    .describe("Barriers to progress noted during the plan period"),
  functional_capacity: z
    .string()
    .describe("Current functional capacity in measurable terms"),
  recommendations: z.array(
    z.object({
      support_category: z.string().describe('e.g. "Improved Daily Living"'),
      hours_per_week: z.number(),
      frequency: z.string().describe('e.g. "1 x 60 min session per week"'),
      rationale: z.string(),
    }),
  ),
});

export type Report = z.infer<typeof ReportSchema>;
export type GoalReport = z.infer<typeof GoalReportSchema>;

// type SessionNote = { id: string; label: string; text: string };

// type Participant = {
//   name: string;
//   ndis_number: string;
//   plan_start: string;
//   plan_end: string;
//   practitioner: string;
//   discipline: string;
// };

export const SessionNoteSchema = z.object({
  id: z.string().describe("Note identifier, e.g. S1"),
  label: z
    .string()
    .describe("Human-readable label for the session, e.g. a date"),
  text: z.string().describe("Raw session note text"),
});

export const ParticipantSchema = z.object({
  name: z.string(),
  ndis_number: z.string(),
  plan_start: z.string(),
  plan_end: z.string(),
  practitioner: z.string(),
  discipline: z.string(),
});

export type SessionNote = z.infer<typeof SessionNoteSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
