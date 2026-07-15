#!/usr/bin/env node

import { buildFixPlan, classifySignals, collectSignals } from "./lib/genlayer-signals.mjs";
import { ensureRepo, formatMatches, printJson } from "./lib/repo-utils.mjs";

function usage() {
  console.log(`Usage:
  node tools/judge-genlayer-builder.mjs <repo-url-or-local-path> [--json]
`);
}

function printReport(source, signals, classification, fixPlan) {
  console.log("");
  console.log("GenLayer Builder Agent");
  console.log("======================");
  console.log(`Source: ${source}`);
  console.log(`Verdict: ${classification.verdict}`);
  console.log("");
  console.log("Check 1: Real GenLayer fit and non-determinism");
  console.log(`Status: ${signals.checks.hasMeaningfulNondet ? "PASS" : "FAIL"}`);
  console.log(formatMatches("Evidence:", [
    ...signals.evidence.nondetPrompt,
    ...signals.evidence.nondetWeb,
    ...signals.evidence.nondetConsensus,
    ...signals.evidence.publicWrite,
  ], "No strong GenLayer-native execution evidence found."));
  console.log("");
  console.log("Check 2: Real app-to-contract execution path");
  console.log(`Status: ${signals.checks.hasExecutionPath ? "PASS" : "FAIL"}`);
  console.log(formatMatches("Evidence:", [
    ...signals.evidence.deployContract,
    ...signals.evidence.writeContract,
    ...signals.evidence.readContract,
    ...signals.evidence.waitReceipt,
  ], "No strong app-to-contract execution path found."));
  console.log("");
  console.log("Check 3: Observable resolution or persisted outcome");
  console.log(`Status: ${signals.checks.hasObservableOutcome ? "PASS" : "FAIL"}`);
  console.log(formatMatches("Evidence:", [
    ...signals.evidence.publicView,
    ...signals.evidence.statePersistence,
    ...signals.evidence.resolution,
  ], "No strong resolution, persistence, or outcome evidence found."));
  console.log("");
  console.log("Flow Coverage");
  console.log(`Deploy: ${signals.flowChecks.deploy ? "yes" : "no"}`);
  console.log(`Submit: ${signals.flowChecks.submit ? "yes" : "no"}`);
  console.log(`Resolve: ${signals.flowChecks.resolve ? "yes" : "no"}`);
  console.log(`Read-back: ${signals.flowChecks.readBack ? "yes" : "no"}`);
  console.log("");
  console.log("README Signals");
  console.log(`Mentions GenLayer: ${signals.readmeSignals.mentionsGenLayer ? "yes" : "no"}`);
  console.log(`Explains GenLayer fit: ${signals.readmeSignals.explainsFit ? "yes" : "no"}`);
  console.log(`Explains workflow: ${signals.readmeSignals.explainsWorkflow ? "yes" : "no"}`);
  console.log("");
  console.log("Reviewer Proof");
  console.log(`Contract files found: ${signals.contractFiles.length}`);
  console.log(`Workflow files found: ${signals.workflowFiles.length}`);
  console.log(`Tests or CI signal: ${signals.checks.hasReviewerProof ? "present" : "weak"}`);
  console.log("");
  if (classification.risks.length) {
    console.log("Risks");
    for (const risk of classification.risks) {
      console.log(`- ${risk}`);
    }
    console.log("");
  }
  if (fixPlan.length) {
    console.log("Top Fixes");
    for (const item of fixPlan.slice(0, 5)) {
      console.log(`- ${item.priority} ${item.area}: ${item.action}`);
    }
    console.log("");
  }
  console.log("Quick Decision");
  if (classification.verdict === "PASS") {
    console.log("- The repo looks like a real GenLayer project.");
  } else if (classification.verdict === "BORDERLINE") {
    console.log("- Some GenLayer signals exist, but the repo still looks risky for reviewer approval.");
  } else {
    console.log("- The repo does not yet prove a real GenLayer workflow.");
  }
}

function main() {
  const input = process.argv[2];
  const asJson = process.argv.includes("--json");

  if (!input) {
    usage();
    process.exit(1);
  }

  const { repoPath, cleanup, source } = ensureRepo(input);
  try {
    const signals = collectSignals(repoPath);
    const classification = classifySignals(signals);
    const fixPlan = buildFixPlan(signals, classification);

    if (asJson) {
    printJson({
        source,
        verdict: classification.verdict,
        checks: signals.checks,
        flowChecks: signals.flowChecks,
        risks: classification.risks,
        fixPlan,
      });
    } else {
      printReport(source, signals, classification, fixPlan);
    }

    process.exitCode = classification.verdict === "PASS" ? 0 : 2;
  } finally {
    if (cleanup) cleanup();
  }
}

main();
