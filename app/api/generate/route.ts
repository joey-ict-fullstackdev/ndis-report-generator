import { generateReport } from "@/lib/generate";
import { verifyReport, enrichReport } from "@/lib/verify";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { participant, goals, notes } = await req.json();
    if (
      !Array.isArray(goals) ||
      goals.length === 0 ||
      !Array.isArray(notes) ||
      notes.length === 0
    ) {
      return Response.json(
        { error: "Provide at least one plan goal and one session note." },
        { status: 400 },
      );
    }
    const { report, usage } = await generateReport(participant, goals, notes);
    // return Response.json({ report: verifyReport(report, notes), usage });
    const verified = verifyReport(report, notes);
    const enriched = enrichReport(verified, notes);
    return Response.json({ report: enriched, usage });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
