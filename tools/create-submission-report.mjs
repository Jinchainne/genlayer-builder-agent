#!/usr/bin/env node

import { buildFixPlan, classifySignals, collectSignals } from "./lib/genlayer-signals.mjs";
import { ensureRepo, printJson } from "./lib/repo-utils.mjs";

function usage() {
  console.log(`Usage:
  node tools/create-submission-report.mjs <repo-url-or-local-path> [--json]
`);
}

function buildMarkdown(source, signals, classification, plan) {
  const lines = [];
  lines.push("# GenLayer Submission Report");
  lines.push("");
  lines.push(`- Source: ${source}`);
  lines.push(`- Verdict: ${classification.verdict}`);
  lines.push(`- GenLayer fit explained in README: ${signals.readmeSignals.explainsFit ? "yes" : "no"}`);
  lines.push(`- Meaningful non-determinism: ${signals.checks.hasMeaningfulNondet ? "yes" : "no"}`);
  lines.push(`- App-to-contract path: ${signals.checks.hasExecutionPath ? "yes" : "no"}`);
  lines.push(`- Observable outcome: ${signals.checks.hasObservableOutcome ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Flow Coverage");
  lines.push("");
  lines.push(`- Deploy: ${signals.flowChecks.deploy ? "present" : "missing"}`);
  lines.push(`- Submit: ${signals.flowChecks.submit ? "present" : "missing"}`);
  lines.push(`- Resolve: ${signals.flowChecks.resolve ? "present" : "missing"}`);
  lines.push(`- Claim: ${signals.flowChecks.claim ? "present" : "missing"}`);
  lines.push(`- Read-back: ${signals.flowChecks.readBack ? "present" : "missing"}`);
  lines.push("");
  lines.push("## Risks");
  lines.push("");
  if (classification.risks.length) {
    for (const risk of classification.risks) {
      lines.push(`- ${risk}`);
    }
  } else {
    lines.push("- No major risks detected.");
  }
  lines.push("");
  lines.push("## Recommended Fixes");
  lines.push("");
  if (plan.length) {
    for (const item of plan) {
      lines.push(`- ${item.priority} ${item.area}: ${item.action}`);
    }
  } else {
    lines.push("- No major fixes suggested.");
  }
  return lines.join("\n");
}

function main() {
  const input = process.argv[2];
  const asJson = process.argv.includes("--json");
  if (!input) {
    usage();
    process.exit(1);
  }

  const { repoPath, cleanup, source } = ensureRepo(input, "genlayer-report-");
  try {
    const signals = collectSignals(repoPath);
    const classification = classifySignals(signals);
    const plan = buildFixPlan(signals, classification);
    const markdown = buildMarkdown(source, signals, classification, plan);

    if (asJson) {
      printJson({
        source,
        verdict: classification.verdict,
        risks: classification.risks,
        flowChecks: signals.flowChecks,
        plan,
        markdown,
      });
      return;
    }

    console.log(markdown);
  } finally {
    if (cleanup) cleanup();
  }
}

main();
