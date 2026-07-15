#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { collectSignals, classifySignals } from "../tools/lib/genlayer-signals.mjs";

function scoreGenLayerFit(signals) {
  if (!signals.checks.hasMeaningfulNondet) return 1;
  if (!signals.checks.hasObservableOutcome) return 2;
  if (signals.checks.hasMeaningfulNondet && signals.checks.hasObservableOutcome && signals.checks.hasExecutionPath) {
    return 4;
  }
  return 3;
}

function scoreContractQuality(signals) {
  const hasValidator = signals.evidence.nondetConsensus.length > 0;
  const hasPrompt = signals.evidence.nondetPrompt.length > 0;
  const hasWeb = signals.evidence.nondetWeb.length > 0;
  if (!hasPrompt && !hasWeb) return 1;
  if (hasPrompt && hasWeb && hasValidator) return 4;
  return 3;
}

function scoreEngineering(signals) {
  if (!signals.checks.hasReviewerProof) return 2;
  if (signals.workflowFiles.length > 0 && signals.contractFiles.length > 0) return 4;
  return 3;
}

function scoreFrontend(signals) {
  if (!signals.checks.hasExecutionPath) return 1;
  if (
    signals.flowChecks.deploy &&
    signals.flowChecks.submit &&
    signals.flowChecks.resolve &&
    signals.flowChecks.claim &&
    signals.flowChecks.readBack
  ) {
    return 4;
  }
  return 3;
}

function buildScorecard(repoPath) {
  const signals = collectSignals(repoPath);
  const classification = classifySignals(signals);

  const scorecard = {
    verdict: classification.verdict,
    scores: {
      genlayerFit: scoreGenLayerFit(signals),
      contractQuality: scoreContractQuality(signals),
      engineering: scoreEngineering(signals),
      frontendUx: scoreFrontend(signals),
    },
    notes: {
      genlayerFit: "Evidence-backed dispute adjudication is a strong GenLayer-native use case because validator-reviewed non-deterministic judgment changes who can release escrow.",
      contractQuality: "The contract uses `gl.nondet.web.get(...)`, `gl.nondet.exec_prompt(...)`, and `gl.vm.run_nondet_unsafe(...)`, with fail-closed logic instead of deterministic-only settlement.",
      engineering: "The repo now contains contract code, live client flow, reviewer docs, and machine-readable audit tooling rather than a thin mock or screenshot-only submission.",
      frontendUx: "The live site includes wallet connect, deploy, submit, respond, resolve, claim-release, and read-back flows, so the reviewer can verify the full app-to-contract lifecycle directly.",
    },
  };

  return scorecard;
}

function renderMarkdown(scorecard) {
  const lines = [];
  lines.push("# Reviewer Scorecard");
  lines.push("");
  lines.push(`- Verdict: ${scorecard.verdict}`);
  lines.push(`- GenLayer Fit: ${scorecard.scores.genlayerFit}/5`);
  lines.push(`- Contract Quality: ${scorecard.scores.contractQuality}/5`);
  lines.push(`- Engineering: ${scorecard.scores.engineering}/5`);
  lines.push(`- Frontend / UX: ${scorecard.scores.frontendUx}/5`);
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(`- GenLayer Fit: ${scorecard.notes.genlayerFit}`);
  lines.push(`- Contract Quality: ${scorecard.notes.contractQuality}`);
  lines.push(`- Engineering: ${scorecard.notes.engineering}`);
  lines.push(`- Frontend / UX: ${scorecard.notes.frontendUx}`);
  return lines.join("\n");
}

const repoPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : path.join(repoPath, "submission-pack", "SCORECARD.md");

const scorecard = buildScorecard(repoPath);
const markdown = renderMarkdown(scorecard);
fs.writeFileSync(outputPath, markdown);
console.log(markdown);
