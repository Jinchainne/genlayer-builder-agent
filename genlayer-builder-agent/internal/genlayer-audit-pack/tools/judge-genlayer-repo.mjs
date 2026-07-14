#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".pytest_cache",
  "__pycache__",
]);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".py",
  ".sol",
  ".toml",
  ".env",
]);

function usage() {
  console.log(`Usage:
  node genlayer-builder-agent/internal/genlayer-audit-pack/tools/judge-genlayer-repo.mjs <repo-url-or-local-path>

Examples:
  node genlayer-builder-agent/internal/genlayer-audit-pack/tools/judge-genlayer-repo.mjs https://github.com/Jinchainne/genlayer-evidence-resolution-agent
  node genlayer-builder-agent/internal/genlayer-audit-pack/tools/judge-genlayer-repo.mjs C:\\work\\my-genlayer-repo
`);
}

function isUrl(input) {
  return /^https?:\/\//i.test(input) || /^git@/i.test(input);
}

function ensureRepo(input) {
  if (!input) {
    usage();
    process.exit(1);
  }

  if (!isUrl(input)) {
    const localPath = path.resolve(input);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local path not found: ${localPath}`);
    }
    return { repoPath: localPath, cleanup: null, source: localPath };
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "genlayer-judge-"));
  const repoPath = path.join(tempRoot, "repo");
  execFileSync("git", ["clone", "--depth", "1", input, repoPath], {
    stdio: "inherit",
  });
  return {
    repoPath,
    cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true }),
    source: input,
  };
}

function shouldReadFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || path.basename(filePath).toLowerCase() === "readme";
}

function walkFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }
      if (shouldReadFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

function rel(repoPath, filePath) {
  return path.relative(repoPath, filePath).replace(/\\/g, "/");
}

function countLine(text, index) {
  return text.slice(0, index).split("\n").length;
}

function findMatches(repoPath, files, regex, limit = 12) {
  const matches = [];
  for (const filePath of files) {
    let text;
    try {
      text = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    const localRegex = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = localRegex.exec(text)) !== null) {
      matches.push({
        file: rel(repoPath, filePath),
        line: countLine(text, match.index),
        snippet: match[0].trim().slice(0, 220),
      });
      if (matches.length >= limit) {
        return matches;
      }
      if (match.index === localRegex.lastIndex) {
        localRegex.lastIndex += 1;
      }
    }
  }
  return matches;
}

function firstFile(repoPath, files, predicate) {
  const hit = files.find((filePath) => predicate(rel(repoPath, filePath)));
  return hit ? rel(repoPath, hit) : null;
}

function readFileIfExists(repoPath, relativePath) {
  const fullPath = path.join(repoPath, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf8");
}

function scoreRepo(repoPath) {
  const files = walkFiles(repoPath);
  const readmePath =
    firstFile(repoPath, files, (name) => /^readme(\.[a-z0-9]+)?$/i.test(path.basename(name))) ||
    firstFile(repoPath, files, (name) => name.toLowerCase().endsWith("/readme.md"));
  const readme = readmePath ? readFileIfExists(repoPath, readmePath) : "";

  const evidence = {
    nondetPrompt: findMatches(repoPath, files, /gl\.nondet\.exec_prompt\s*\(/g),
    nondetWeb: findMatches(repoPath, files, /gl\.nondet\.web\.get\s*\(/g),
    nondetConsensus: findMatches(repoPath, files, /gl\.vm\.run_nondet_unsafe\s*\(/g),
    publicWrite: findMatches(repoPath, files, /@gl\.public\.write/g),
    publicView: findMatches(repoPath, files, /@gl\.public\.view/g),
    genlayerJsCreateClient: findMatches(repoPath, files, /createClient\s*\(/g),
    readContract: findMatches(repoPath, files, /readContract\s*\(/g),
    writeContract: findMatches(repoPath, files, /writeContract\s*\(/g),
    waitReceipt: findMatches(repoPath, files, /waitForTransactionReceipt\s*\(/g),
    deployContract: findMatches(repoPath, files, /deployContract\s*\(/g),
    walletConnect: findMatches(repoPath, files, /wallet|connect wallet|wallet connected/gi),
    policyBound: findMatches(repoPath, files, /policyBoundToExecution|blockedByPolicy|bindPolicy|policy rejected/gi),
    genlayerWriteCall: findMatches(repoPath, files, /genlayerWrite\s*\(/g),
    cliOnly: findMatches(repoPath, files, /npx genlayer|genlayer call|genlayer write/gi),
    staticOnlyHints: findMatches(repoPath, files, /static contract|cli instructions|placeholder|mock/gi),
    tests: findMatches(repoPath, files, /pytest|describe\s*\(|it\s*\(|test\s*\(/g),
    ci: findMatches(repoPath, files, /name:\s|on:\s*push|pytest|npm run/gi),
  };

  const contractFiles = files
    .map((filePath) => rel(repoPath, filePath))
    .filter((name) => /^contracts\//.test(name) || /genlayer/i.test(name));

  const appFiles = files
    .map((filePath) => rel(repoPath, filePath))
    .filter((name) => /^app\//.test(name) || /^src\//.test(name) || /^lib\//.test(name));

  const hasMeaningfulNondet =
    (evidence.nondetPrompt.length > 0 || evidence.nondetWeb.length > 0) &&
    evidence.nondetConsensus.length > 0 &&
    evidence.publicWrite.length > 0;

  const hasRealClientPath =
    evidence.readContract.length > 0 &&
    evidence.writeContract.length > 0 &&
    (evidence.waitReceipt.length > 0 || evidence.genlayerWriteCall.length > 0);

  const hasBoundExecution = evidence.policyBound.length > 0;

  const hasAppToContractWorkflow =
    hasRealClientPath &&
    hasBoundExecution &&
    appFiles.length > 0 &&
    (evidence.walletConnect.length > 0 || evidence.deployContract.length > 0);

  const readmeSignals = {
    mentionsGenLayer: /genlayer/i.test(readme),
    explainsFit: /why it belongs|why genlayer|belongs on genlayer|adjudication|policy|evidence|dispute/i.test(readme),
    explainsWorkflow: /deploy|import|submit|resolve|read|write|workflow|verify/i.test(readme),
  };

  const hasReviewerProof =
    Boolean(readmePath) &&
    (evidence.tests.length > 0 || fs.existsSync(path.join(repoPath, ".github", "workflows"))) &&
    contractFiles.length > 0;

  const image1Pass = hasMeaningfulNondet;
  const image2Pass = hasAppToContractWorkflow;

  let verdict = "FAIL";
  if (image1Pass && image2Pass) {
    verdict = "PASS";
  } else if (image1Pass || image2Pass || hasRealClientPath) {
    verdict = "BORDERLINE";
  }

  const risks = [];
  if (!image1Pass) {
    risks.push("Missing strong proof of meaningful non-deterministic GenLayer contract execution.");
  }
  if (!image2Pass) {
    risks.push("Missing strong proof of real app-to-contract workflow bound to execution.");
  }
  if (!readmeSignals.explainsFit) {
    risks.push("README does not clearly explain why the use case belongs on GenLayer.");
  }
  if (!hasReviewerProof) {
    risks.push("Reviewer proof is thin: tests or CI evidence is weak.");
  }

  return {
    repoPath,
    readmePath,
    contractFiles,
    appFiles,
    evidence,
    readmeSignals,
    checks: {
      image1Pass,
      image2Pass,
      hasMeaningfulNondet,
      hasRealClientPath,
      hasBoundExecution,
      hasAppToContractWorkflow,
      hasReviewerProof,
    },
    verdict,
    risks,
  };
}

function formatMatches(title, matches, emptyMessage) {
  const lines = [`${title}`];
  if (!matches.length) {
    lines.push(`  - ${emptyMessage}`);
    return lines.join("\n");
  }
  for (const match of matches.slice(0, 4)) {
    lines.push(`  - ${match.file}:${match.line} -> ${match.snippet}`);
  }
  return lines.join("\n");
}

function printReport(source, result) {
  console.log("");
  console.log("GenLayer Repo Judge");
  console.log("===================");
  console.log(`Source: ${source}`);
  console.log(`Verdict: ${result.verdict}`);
  console.log("");
  console.log("Image 1 Check: Meaningful non-deterministic GenLayer result");
  console.log(`Status: ${result.checks.image1Pass ? "PASS" : "FAIL"}`);
  console.log(formatMatches("Evidence:", [
    ...result.evidence.nondetPrompt,
    ...result.evidence.nondetWeb,
    ...result.evidence.nondetConsensus,
  ], "No nondeterministic contract evidence found."));
  console.log("");
  console.log("Image 2 Check: Real application-to-contract workflow");
  console.log(`Status: ${result.checks.image2Pass ? "PASS" : "FAIL"}`);
  console.log(formatMatches("Evidence:", [
    ...result.evidence.readContract,
    ...result.evidence.writeContract,
    ...result.evidence.policyBound,
    ...result.evidence.genlayerWriteCall,
  ], "No strong read/write execution-bound workflow evidence found."));
  console.log("");
  console.log("GenLayer Fit Signals");
  console.log(`README mentions GenLayer: ${result.readmeSignals.mentionsGenLayer ? "yes" : "no"}`);
  console.log(`README explains fit: ${result.readmeSignals.explainsFit ? "yes" : "no"}`);
  console.log(`README explains workflow: ${result.readmeSignals.explainsWorkflow ? "yes" : "no"}`);
  console.log("");
  console.log("Reviewer Proof");
  console.log(`Contract files found: ${result.contractFiles.length}`);
  console.log(`App/client files found: ${result.appFiles.length}`);
  console.log(`Tests/CI signal: ${result.checks.hasReviewerProof ? "present" : "weak"}`);
  console.log("");
  if (result.risks.length) {
    console.log("Risks");
    for (const risk of result.risks) {
      console.log(`- ${risk}`);
    }
    console.log("");
  }
  console.log("Quick Decision");
  if (result.verdict === "PASS") {
    console.log("- Safe against the two rejection patterns in the screenshots.");
  } else if (result.verdict === "BORDERLINE") {
    console.log("- Some GenLayer signals exist, but reviewer rejection risk remains.");
  } else {
    console.log("- Not ready against the screenshot rejection criteria.");
  }
}

function main() {
  const input = process.argv[2];
  const { repoPath, cleanup, source } = ensureRepo(input);
  try {
    const result = scoreRepo(repoPath);
    printReport(source, result);
    process.exitCode = result.verdict === "PASS" ? 0 : 2;
  } finally {
    if (cleanup) cleanup();
  }
}

main();
