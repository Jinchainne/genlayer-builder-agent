#!/usr/bin/env node

import { collectSignals } from "./lib/genlayer-signals.mjs";
import { ensureRepo, printJson } from "./lib/repo-utils.mjs";

function usage() {
  console.log(`Usage:
  node tools/find-missing-flow.mjs <repo-url-or-local-path> [--json]
`);
}

function main() {
  const input = process.argv[2];
  const asJson = process.argv.includes("--json");
  if (!input) {
    usage();
    process.exit(1);
  }

  const { repoPath, cleanup, source } = ensureRepo(input, "genlayer-flow-");
  try {
    const signals = collectSignals(repoPath);
    const gaps = [];
    if (!signals.flowChecks.deploy) gaps.push("Missing deploy or import flow.");
    if (!signals.flowChecks.submit) gaps.push("Missing submit write flow.");
    if (!signals.flowChecks.resolve) gaps.push("Missing resolve or execution flow.");
    if (!signals.flowChecks.claim) gaps.push("Missing claim-release or final payout flow.");
    if (!signals.flowChecks.readBack) gaps.push("Missing read-back or view flow.");
    if (!signals.workflowFiles.length) gaps.push("Missing clear app or agent workflow entrypoints.");

    const result = {
      source,
      flowChecks: signals.flowChecks,
      workflowFiles: signals.workflowFiles,
      gaps,
    };

    if (asJson) {
      printJson(result);
      return;
    }

    console.log("");
    console.log("GenLayer Missing Flow Finder");
    console.log("============================");
    console.log(`Source: ${source}`);
    console.log("");
    console.log(`Deploy: ${signals.flowChecks.deploy ? "present" : "missing"}`);
    console.log(`Submit: ${signals.flowChecks.submit ? "present" : "missing"}`);
    console.log(`Resolve: ${signals.flowChecks.resolve ? "present" : "missing"}`);
    console.log(`Claim: ${signals.flowChecks.claim ? "present" : "missing"}`);
    console.log(`Read-back: ${signals.flowChecks.readBack ? "present" : "missing"}`);
    console.log("");
    if (gaps.length) {
      console.log("Gaps");
      for (const gap of gaps) {
        console.log(`- ${gap}`);
      }
    } else {
      console.log("No major flow gaps found.");
    }
  } finally {
    if (cleanup) cleanup();
  }
}

main();
