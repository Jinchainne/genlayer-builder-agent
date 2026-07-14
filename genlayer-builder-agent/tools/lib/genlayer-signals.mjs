import fs from "fs";
import path from "path";
import {
  filterFiles,
  findMatches,
  firstFile,
  readFileIfExists,
  rel,
  sumLengths,
  walkFiles,
} from "./repo-utils.mjs";

export function collectSignals(repoPath) {
  const files = walkFiles(repoPath);
  const codeFiles = filterFiles(repoPath, files, (name) => {
    const ext = path.extname(name).toLowerCase();
    const isCode = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sol", ".rs"].includes(ext);
    const isVendored = name.startsWith("vendored/");
    const isThisPackage = name.startsWith("genlayer-builder-agent/");
    const isJudgeHelper = /(^|\/)tools\/(judge|scan|find|generate|create)-.*\.(mjs|js|ts)$/i.test(name);
    const isInternalLib = /(^|\/)tools\/lib\/.+\.(mjs|js|ts)$/i.test(name);
    const isReferenceDoc =
      name.includes("/references/") ||
      /(^|\/)(readme|skill)\.md$/i.test(name) ||
      /\.md$/i.test(name);
    return isCode && !isVendored && !isThisPackage && !isJudgeHelper && !isInternalLib && !isReferenceDoc;
  });

  const readmePath =
    firstFile(repoPath, files, (name) => /^readme(\.[a-z0-9]+)?$/i.test(path.basename(name))) ||
    firstFile(repoPath, files, (name) => name.toLowerCase().endsWith("/readme.md"));
  const readme = readmePath ? readFileIfExists(repoPath, readmePath) : "";

  const evidence = {
    nondetPrompt: findMatches(repoPath, codeFiles, /gl\.nondet\.exec_prompt\s*\(/g),
    nondetWeb: findMatches(repoPath, codeFiles, /gl\.nondet\.web\.get\s*\(/g),
    nondetConsensus: findMatches(repoPath, codeFiles, /gl\.vm\.run_nondet_unsafe\s*\(/g),
    publicWrite: findMatches(repoPath, codeFiles, /@gl\.public\.write/g),
    publicView: findMatches(repoPath, codeFiles, /@gl\.public\.view/g),
    createClient: findMatches(repoPath, codeFiles, /createClient\s*\(/g),
    readContract: findMatches(repoPath, codeFiles, /readContract\s*\(/g),
    writeContract: findMatches(repoPath, codeFiles, /writeContract\s*\(/g),
    deployContract: findMatches(repoPath, codeFiles, /deployContract\s*\(/g),
    waitReceipt: findMatches(repoPath, codeFiles, /waitForTransactionReceipt\s*\(|wait.*receipt/gi),
    walletConnect: findMatches(repoPath, codeFiles, /wallet|connect wallet|wallet connected/gi),
    genlayerMentions: findMatches(repoPath, codeFiles, /\bgenlayer\b|intelligent contract|validator/gi),
    statePersistence: findMatches(repoPath, codeFiles, /storage|result|verdict|resolved|accepted|state/gi),
    caseSubmission: findMatches(repoPath, codeFiles, /submit|create case|create market|open case|claim/gi),
    resolution: findMatches(repoPath, codeFiles, /resolve|decision|verdict|finalize|adjudicat/gi),
    tests: findMatches(repoPath, files, /pytest|describe\s*\(|it\s*\(|test\s*\(/g),
    ci: findMatches(repoPath, files, /name:\s|on:\s*push|pytest|npm run|pnpm|yarn/gi),
  };

  const workflowFiles = files
    .map((filePath) => rel(repoPath, filePath))
    .filter((name) => /^app\//.test(name) || /^src\//.test(name) || /^lib\//.test(name) || /^agents\//.test(name));

  const contractFiles = files
    .map((filePath) => rel(repoPath, filePath))
    .filter((name) => /^contracts\//.test(name) || /\.py$/i.test(name) && /contract|genlayer/i.test(name));

  const hasMeaningfulNondet =
    (evidence.nondetPrompt.length > 0 || evidence.nondetWeb.length > 0) &&
    evidence.publicWrite.length > 0;

  const hasConsensusSignal =
    evidence.nondetConsensus.length > 0 || evidence.genlayerMentions.length > 0;

  const hasExecutionPath =
    workflowFiles.length > 0 &&
    (evidence.readContract.length > 0 || evidence.writeContract.length > 0 || evidence.deployContract.length > 0);

  const hasObservableOutcome =
    evidence.publicView.length > 0 ||
    evidence.statePersistence.length > 0 ||
    evidence.waitReceipt.length > 0 ||
    evidence.resolution.length > 0;

  const hasReviewerProof =
    Boolean(readmePath) &&
    (evidence.tests.length > 0 || fs.existsSync(path.join(repoPath, ".github", "workflows")));

  const readmeSignals = {
    mentionsGenLayer: /genlayer/i.test(readme),
    explainsFit: /judgment|adjudication|evidence|ambiguity|oracle|resolve|nondetermin|validator/i.test(readme),
    explainsWorkflow: /workflow|flow|deploy|submit|resolve|read|write|contract|verify/i.test(readme),
  };

  const flowChecks = {
    deploy: evidence.deployContract.length > 0,
    submit: evidence.writeContract.length > 0 || evidence.caseSubmission.length > 0,
    resolve: evidence.resolution.length > 0 || evidence.nondetPrompt.length > 0 || evidence.nondetWeb.length > 0,
    readBack: evidence.readContract.length > 0 || evidence.publicView.length > 0,
  };

  const fitScore = sumLengths([
    evidence.nondetPrompt,
    evidence.nondetWeb,
    evidence.nondetConsensus,
    evidence.publicWrite,
    evidence.publicView,
  ]);

  return {
    repoPath,
    files,
    codeFiles,
    readmePath,
    readme,
    workflowFiles,
    contractFiles,
    evidence,
    readmeSignals,
    flowChecks,
    checks: {
      hasMeaningfulNondet,
      hasConsensusSignal,
      hasExecutionPath,
      hasObservableOutcome,
      hasReviewerProof,
      fitScore,
    },
  };
}

export function classifySignals(signals) {
  const { checks, readmeSignals } = signals;
  const risks = [];

  if (!checks.hasMeaningfulNondet) {
    risks.push("Missing proof of meaningful GenLayer-native non-deterministic execution.");
  }
  if (!checks.hasExecutionPath) {
    risks.push("Missing a clear execution path from app or agent code into the GenLayer contract layer.");
  }
  if (!checks.hasObservableOutcome) {
    risks.push("Missing proof that the project persists, resolves, or otherwise makes the contract outcome observable.");
  }
  if (!readmeSignals.explainsFit) {
    risks.push("README does not clearly explain why the use case belongs on GenLayer.");
  }
  if (!checks.hasReviewerProof) {
    risks.push("Reviewer proof is thin: tests, scripts, or CI evidence is weak.");
  }

  const hasRealWorkflow =
    checks.hasMeaningfulNondet &&
    checks.hasConsensusSignal &&
    checks.hasExecutionPath &&
    checks.hasObservableOutcome;

  let verdict = "FAIL";
  if (hasRealWorkflow && checks.hasReviewerProof) {
    verdict = "PASS";
  } else if (checks.hasExecutionPath || (checks.hasMeaningfulNondet && checks.hasObservableOutcome)) {
    verdict = "BORDERLINE";
  }

  return {
    verdict,
    risks,
    hasRealWorkflow,
  };
}

export function buildFixPlan(signals, classification) {
  const items = [];
  const { checks, flowChecks, readmeSignals } = signals;

  if (!checks.hasMeaningfulNondet) {
    items.push({
      priority: "P0",
      area: "contract",
      action: "Add a real non-deterministic path using `gl.nondet.web.get(...)` and/or `gl.nondet.exec_prompt(...)` in a public write flow.",
    });
  }
  if (!flowChecks.deploy) {
    items.push({
      priority: "P0",
      area: "client",
      action: "Add a deploy or import path so a reviewer can reach a live contract from the app or agent workflow.",
    });
  }
  if (!flowChecks.submit) {
    items.push({
      priority: "P0",
      area: "client",
      action: "Add a submit write call that sends a real claim, market, or case into the contract.",
    });
  }
  if (!flowChecks.resolve) {
    items.push({
      priority: "P0",
      area: "contract",
      action: "Add a resolve path where the non-deterministic contract logic actually determines the outcome.",
    });
  }
  if (!flowChecks.readBack) {
    items.push({
      priority: "P0",
      area: "client",
      action: "Add a read-back view or contract read so the on-chain result is visible after execution.",
    });
  }
  if (!checks.hasReviewerProof) {
    items.push({
      priority: "P1",
      area: "validation",
      action: "Add direct tests, integration tests, or CI commands that prove the end-to-end flow works.",
    });
  }
  if (!readmeSignals.explainsFit || !readmeSignals.explainsWorkflow) {
    items.push({
      priority: "P1",
      area: "docs",
      action: "Rewrite the README to explain why the project belongs on GenLayer and show deploy -> submit -> resolve -> read-back verification.",
    });
  }
  if (!signals.workflowFiles.length) {
    items.push({
      priority: "P1",
      area: "app",
      action: "Add an application or agent workflow entrypoint under `app/`, `src/`, `lib/`, or `agents/` that exercises the contract path.",
    });
  }
  if (classification.verdict === "PASS") {
    items.push({
      priority: "P2",
      area: "submission",
      action: "Polish demo proof, screenshots, and reviewer commands so the project is easy to assess under time pressure.",
    });
  }

  return items;
}
