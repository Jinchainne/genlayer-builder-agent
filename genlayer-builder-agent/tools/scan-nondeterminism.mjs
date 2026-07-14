#!/usr/bin/env node

import { classifySignals, collectSignals } from "./lib/genlayer-signals.mjs";
import { ensureRepo, formatMatches, printJson } from "./lib/repo-utils.mjs";

function usage() {
  console.log(`Usage:
  node genlayer-builder-agent/tools/scan-nondeterminism.mjs <repo-url-or-local-path> [--json]
`);
}

function classifyRisk(signals) {
  if (signals.checks.hasMeaningfulNondet && signals.checks.hasObservableOutcome) {
    return "LOW";
  }
  if (signals.evidence.publicWrite.length > 0 || signals.evidence.nondetPrompt.length > 0 || signals.evidence.nondetWeb.length > 0) {
    return "MEDIUM";
  }
  return "HIGH";
}

function main() {
  const input = process.argv[2];
  const asJson = process.argv.includes("--json");
  if (!input) {
    usage();
    process.exit(1);
  }

  const { repoPath, cleanup, source } = ensureRepo(input, "genlayer-nondet-");
  try {
    const signals = collectSignals(repoPath);
    const classification = classifySignals(signals);
    const risk = classifyRisk(signals);

    const result = {
      source,
      risk,
      hasMeaningfulNondet: signals.checks.hasMeaningfulNondet,
      hasObservableOutcome: signals.checks.hasObservableOutcome,
      signals: {
        nondetPrompt: signals.evidence.nondetPrompt,
        nondetWeb: signals.evidence.nondetWeb,
        nondetConsensus: signals.evidence.nondetConsensus,
        publicWrite: signals.evidence.publicWrite,
        publicView: signals.evidence.publicView,
      },
      risks: classification.risks.filter((riskLine) => riskLine.includes("non-deterministic") || riskLine.includes("observable")),
    };

    if (asJson) {
      printJson(result);
      return;
    }

    console.log("");
    console.log("GenLayer Nondeterminism Scan");
    console.log("============================");
    console.log(`Source: ${source}`);
    console.log(`Risk: ${risk}`);
    console.log(`Meaningful non-determinism: ${signals.checks.hasMeaningfulNondet ? "yes" : "no"}`);
    console.log(`Observable outcome: ${signals.checks.hasObservableOutcome ? "yes" : "no"}`);
    console.log("");
    console.log(formatMatches("Non-deterministic evidence:", [
      ...signals.evidence.nondetPrompt,
      ...signals.evidence.nondetWeb,
      ...signals.evidence.nondetConsensus,
      ...signals.evidence.publicWrite,
    ], "No meaningful non-deterministic contract evidence found."));
    console.log("");
    console.log(formatMatches("Outcome evidence:", [
      ...signals.evidence.publicView,
      ...signals.evidence.statePersistence,
      ...signals.evidence.resolution,
    ], "No clear persisted or readable outcome evidence found."));
  } finally {
    if (cleanup) cleanup();
  }
}

main();
