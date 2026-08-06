import { generateReport } from "@/lib/generate";
import { Participant, Report, SessionNote } from "@/lib/schema";
import { verifyReport } from "@/lib/verify";
import fs from "fs";
import path from "path";


const dir = "./data/synthetic";
const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));

for (const file of files) {
  const fullPath = path.join(dir, file);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const data = JSON.parse(raw) as {
    name: string;
    participant: Participant;
    goals: string[];
    notes: SessionNote[];
  };

  const { report, usage } = await generateReport(
    data.participant,
    data.goals,
    data.notes,
  );

  const verifiedReport = verifyReport(report, data.notes);

  const failures: string[] = [];
  let hadFailure = false;

  if (verifiedReport.goals.length !== data.goals.length) {
    failures.push(`Goal cound mismatch: expected ${data.goals.length}`);
  }

  for (let i = 0; i < data.goals.length; i++) {
    const expectedGoal = data.goals[i];
    const actualGoal = verifiedReport.goals[i];

    if (actualGoal.goal_text !== expectedGoal) {
      failures.push(
        `Goal text mismatch at index ${i}: expected ${expectedGoal}`,
      );
    }
  }

  for (let i = 0; i < verifiedReport.goals.length; i++) {
    const expectedGoal = data.goals[i];
    const goal = verifiedReport.goals[i];

    if (expectedGoal.includes("swimming")) {
      if (!goal.insufficient_evidence) {
        failures.push(`Expected insufficient_evidence=true for goal ${goal}`);
      }
    } else {
      if (!goal.claims.some((claim) => claim.verified)) {
        failures.push(`Expected at least one verified claim for goal ${goal}`);
      }
    }
  }

  if (failures.length === 0) {
    console.log(`Pass ${data.name}`);
  } else {
    console.log(`FAIL: ${data.name}`);
    for (const message of failures) {
      console.log(`- ${message}`);
    }
    hadFailure = true;
  }

  if (hadFailure) {
    process.exit(1);
  }
}
