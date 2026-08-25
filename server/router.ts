import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { generateReport } from "@/lib/generate";
import { verifyReport, enrichReport } from "@/lib/verify";
import { ParticipantSchema, SessionNoteSchema } from "@/lib/schema";

export const appRouter = router({
  generate: publicProcedure
    .input(
      z.object({
        participant: ParticipantSchema,
        goals: z.array(z.string()).min(1),
        notes: z.array(SessionNoteSchema).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { report, usage } = await generateReport(
        input.participant,
        input.goals,
        input.notes,
      );
      const verified = verifyReport(report, input.notes);
      return { report: enrichReport(verified, input.notes), usage };
    }),
});

export type AppRouter = typeof appRouter;
