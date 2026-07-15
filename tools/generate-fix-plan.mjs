#!/usr/bin/env node

import { buildFixPlan, classifySignals, collectSignals } from "./lib/genlayer-signals.mjs";
import { ensureRepo, printJson } from "./lib/repo-utils.mjs";

function usage() {
  console.log(`Usage:
  node tools/generate-fix-plan.mjs <repo-url-or-local-path> [--json]
`);
}

function main() {
  const input = process.argv[2];
  const asJson = process.argv.includes("--json");
  if (!input) {
    usage();
    process.exit(1);
  }

  const { repoPath, cleanup, source } = ensureRepo(input, "genlayer-plan-");
  try {
    const signals = collectSignals(repoPath);
    const classification = classifySignals(signals);
    const plan = buildFixPlan(signals, classification);

    if (asJson) {
      printJson({ source, verdict: classification.verdict, plan });
      return;
    }

    console.log("");
    console.log("GenLayer Fix Plan");
    console.log("=================");
    console.log(`Source: ${source}`);
    console.log(`Current verdict: ${classification.verdict}`);
    console.log("");
    if (!plan.length) {
      console.log("No major fixes suggested.");
      return;
    }
    for (const item of plan) {
      console.log(`- ${item.priority} ${item.area}: ${item.action}`);
    }
  } finally {
    if (cleanup) cleanup();
  }
}

main();
