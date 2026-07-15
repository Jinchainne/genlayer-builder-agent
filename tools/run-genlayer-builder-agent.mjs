#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildFixPlan, classifySignals, collectSignals } from "./lib/genlayer-signals.mjs";
import { ensureRepo, printJson } from "./lib/repo-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage() {
  console.log(`Usage:
  node tools/run-genlayer-builder-agent.mjs <repo-url-or-local-path> [--profile judge|coach|submission] [--json]
`);
}

function loadProfile(profileName) {
  const safeProfile = profileName || "coach";
  const profilePath = path.join(__dirname, "..", "profiles", `${safeProfile}.json`);
  return JSON.parse(fs.readFileSync(profilePath, "utf8"));
}

function buildAgentResult(source, profile, signals, classification, fixPlan) {
  const summary = {
    source,
    profile: profile.name,
    verdict: classification.verdict,
    fitScore: signals.checks.fitScore,
  };

  const checks = {
    meaningfulNondeterminism: signals.checks.hasMeaningfulNondet,
    appToContractPath: signals.checks.hasExecutionPath,
    observableOutcome: signals.checks.hasObservableOutcome,
    reviewerProof: signals.checks.hasReviewerProof,
  };

  const flow = signals.flowChecks;
  const reviewerNotes = [
    signals.readmeSignals.explainsFit
      ? "README explains GenLayer fit."
      : "README should better explain why this project belongs on GenLayer.",
    signals.checks.hasReviewerProof
      ? "Tests or CI signals are present."
      : "Tests or CI signals are weak.",
  ];

  return {
    profile: profile.name,
    goal: profile.goal,
    summary,
    checks,
    flow,
    risks: classification.risks,
    fixPlan,
    reviewerNotes,
    recommendedTools: [
      "judge-genlayer-builder.mjs",
      "scan-nondeterminism.mjs",
      "find-missing-flow.mjs",
      "generate-fix-plan.mjs",
      "create-submission-report.mjs",
    ],
  };
}

function printHuman(result) {
  console.log("");
  console.log("GenLayer Builder Agent");
  console.log("======================");
  console.log(`Profile: ${result.profile}`);
  console.log(`Goal: ${result.goal}`);
  console.log(`Source: ${result.summary.source}`);
  console.log(`Verdict: ${result.summary.verdict}`);
  console.log("");
  console.log("Checks");
  console.log(`- Meaningful non-determinism: ${result.checks.meaningfulNondeterminism ? "yes" : "no"}`);
  console.log(`- App-to-contract path: ${result.checks.appToContractPath ? "yes" : "no"}`);
  console.log(`- Observable outcome: ${result.checks.observableOutcome ? "yes" : "no"}`);
  console.log(`- Reviewer proof: ${result.checks.reviewerProof ? "yes" : "no"}`);
  console.log("");
  console.log("Flow");
  console.log(`- Deploy: ${result.flow.deploy ? "present" : "missing"}`);
  console.log(`- Submit: ${result.flow.submit ? "present" : "missing"}`);
  console.log(`- Resolve: ${result.flow.resolve ? "present" : "missing"}`);
  console.log(`- Read-back: ${result.flow.readBack ? "present" : "missing"}`);
  console.log("");
  if (result.risks.length) {
    console.log("Risks");
    for (const risk of result.risks) {
      console.log(`- ${risk}`);
    }
    console.log("");
  }
  if (result.fixPlan.length) {
    console.log("Fix Plan");
    for (const item of result.fixPlan.slice(0, 6)) {
      console.log(`- ${item.priority} ${item.area}: ${item.action}`);
    }
    console.log("");
  }
  console.log("Recommended Tools");
  for (const toolName of result.recommendedTools) {
    console.log(`- ${toolName}`);
  }
}

function main() {
  const input = process.argv[2];
  const asJson = process.argv.includes("--json");
  const profileFlagIndex = process.argv.indexOf("--profile");
  const profileName = profileFlagIndex > -1 ? process.argv[profileFlagIndex + 1] : "coach";

  if (!input) {
    usage();
    process.exit(1);
  }

  const { repoPath, cleanup, source } = ensureRepo(input, "genlayer-agent-");
  try {
    const profile = loadProfile(profileName);
    const signals = collectSignals(repoPath);
    const classification = classifySignals(signals);
    const fixPlan = buildFixPlan(signals, classification);
    const result = buildAgentResult(source, profile, signals, classification, fixPlan);

    if (asJson) {
      printJson(result);
      return;
    }

    printHuman(result);
  } finally {
    if (cleanup) cleanup();
  }
}

main();
