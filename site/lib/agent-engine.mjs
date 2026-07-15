import zlib from "zlib";

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
  ".rs",
  ".toml",
  ".env",
]);

const PROFILES = {
  judge: {
    name: "judge",
    goal: "Return a direct repo verdict with evidence and risks.",
  },
  coach: {
    name: "coach",
    goal: "Explain what is missing and how to fix it in the shortest path to readiness.",
  },
  submission: {
    name: "submission",
    goal: "Produce a reviewer-facing readiness report for a GenLayer submission.",
  },
};

function parseGitHubUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Please enter a valid GitHub repository URL.");
  }

  if (url.hostname !== "github.com") {
    throw new Error("Live demo currently supports public GitHub repository URLs only.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("GitHub URL must look like https://github.com/owner/repo.");
  }

  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/i, ""),
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "genlayer-builder-agent",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${text.slice(0, 220)}`);
  }
  return response.text();
}

function shouldIgnorePath(filePath) {
  return filePath.split("/").some((part) => IGNORE_DIRS.has(part));
}

function shouldReadPath(filePath) {
  const lower = filePath.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  return TEXT_EXTENSIONS.has(ext) || /(^|\/)readme(\.[a-z0-9]+)?$/i.test(filePath);
}

function countLine(text, index) {
  return text.slice(0, index).split("\n").length;
}

function findMatches(files, regex, limit = 12) {
  const matches = [];
  for (const file of files) {
    const localRegex = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = localRegex.exec(file.content)) !== null) {
      matches.push({
        file: file.path,
        line: countLine(file.content, match.index),
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

function sumLengths(groups) {
  return groups.reduce((total, group) => total + group.length, 0);
}

function parseDefaultBranch(html) {
  const match = html.match(/"defaultBranch":"([^"]+)"/);
  if (match?.[1]) {
    return match[1];
  }
  return "main";
}

function parseDescription(html) {
  const match = html.match(/<meta property="og:description" content="([^"]*)"/i);
  return match?.[1] || "";
}

function parseStars(html) {
  const match = html.match(/<a[^>]*href="\/[^/]+\/[^/]+\/stargazers"[^>]*>\s*([\d,]+)\s*</i);
  if (!match?.[1]) {
    return 0;
  }
  return Number(match[1].replaceAll(",", "")) || 0;
}

function readString(buffer, start, end) {
  return buffer.toString("utf8", start, end).replace(/\0.*$/, "").trim();
}

function parseTarGz(buffer) {
  const tarBuffer = zlib.gunzipSync(buffer);
  const files = [];

  for (let offset = 0; offset < tarBuffer.length; offset += 512) {
    const header = tarBuffer.subarray(offset, offset + 512);
    const name = readString(header, 0, 100);
    if (!name) {
      break;
    }

    const sizeOctal = readString(header, 124, 136);
    const size = Number.parseInt(sizeOctal || "0", 8) || 0;
    const typeFlag = readString(header, 156, 157) || "0";
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;

    if (typeFlag === "0" || typeFlag === "") {
      files.push({
        path: name,
        content: tarBuffer.subarray(contentStart, contentEnd).toString("utf8"),
      });
    }

    const blocks = Math.ceil(size / 512);
    offset += blocks * 512;
  }

  return files;
}

async function loadRepoFiles(owner, repo) {
  const repoHtml = await fetchText(`https://github.com/${owner}/${repo}`);
  const defaultBranch = parseDefaultBranch(repoHtml);
  const description = parseDescription(repoHtml);
  const stars = parseStars(repoHtml);

  const tarResponse = await fetch(
    `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${defaultBranch}`,
    { headers: { "User-Agent": "genlayer-builder-agent" } }
  );
  if (!tarResponse.ok) {
    const text = await tarResponse.text();
    throw new Error(`GitHub tarball fetch failed (${tarResponse.status}): ${text.slice(0, 220)}`);
  }

  const archiveBuffer = Buffer.from(await tarResponse.arrayBuffer());
  const archiveFiles = await parseTarGz(archiveBuffer);
  const files = archiveFiles
    .map((file) => {
      const parts = file.path.split("/");
      parts.shift();
      return {
        path: parts.join("/"),
        content: file.content,
      };
    })
    .filter((file) => file.path)
    .filter((file) => !shouldIgnorePath(file.path))
    .filter((file) => shouldReadPath(file.path))
    .filter((file) => Buffer.byteLength(file.content, "utf8") <= 180000)
    .slice(0, 180);

  return {
    source: `https://github.com/${owner}/${repo}`,
    files,
    defaultBranch,
    description,
    stars,
  };
}

function collectSignalsFromFiles(files) {
  const codeFiles = files.filter((file) => {
    const ext = file.path.includes(".") ? file.path.slice(file.path.lastIndexOf(".")).toLowerCase() : "";
    const isCode = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sol", ".rs"].includes(ext);
    const isVendored =
      file.path.startsWith("vendored/") ||
      file.path.startsWith("third_party/vendored/") ||
      file.path.includes("/third_party/vendored/");
    const isJudgeHelper = /(^|\/)tools\/(judge|scan|find|generate|create)-.*\.(mjs|js|ts)$/i.test(file.path);
    const isInternalLib = /(^|\/)tools\/lib\/.+\.(mjs|js|ts)$/i.test(file.path);
    const isReferenceDoc =
      file.path.includes("/references/") ||
      /(^|\/)(readme|skill)\.md$/i.test(file.path) ||
      /\.md$/i.test(file.path);
    return isCode && !isVendored && !isJudgeHelper && !isInternalLib && !isReferenceDoc;
  });

  const readmeFile =
    files.find((file) => /^readme(\.[a-z0-9]+)?$/i.test(file.path.split("/").pop() || "")) ||
    files.find((file) => file.path.toLowerCase().endsWith("/readme.md"));
  const readme = readmeFile?.content || "";

  const evidence = {
    nondetPrompt: findMatches(codeFiles, /gl\.nondet\.exec_prompt\s*\(/g),
    nondetWeb: findMatches(codeFiles, /gl\.nondet\.web\.get\s*\(/g),
    nondetConsensus: findMatches(codeFiles, /gl\.vm\.run_nondet_unsafe\s*\(/g),
    publicWrite: findMatches(codeFiles, /@gl\.public\.write/g),
    publicView: findMatches(codeFiles, /@gl\.public\.view/g),
    readContract: findMatches(codeFiles, /readContract\s*\(/g),
    writeContract: findMatches(codeFiles, /writeContract\s*\(/g),
    deployContract: findMatches(codeFiles, /deployContract\s*\(/g),
    waitReceipt: findMatches(codeFiles, /waitForTransactionReceipt\s*\(|wait.*receipt/gi),
    claimRelease: findMatches(codeFiles, /claim_release|claimDisputeRelease|Claim Release/gi),
    genlayerMentions: findMatches(codeFiles, /\bgenlayer\b|intelligent contract|validator/gi),
    statePersistence: findMatches(codeFiles, /storage|result|verdict|resolved|accepted|state/gi),
    caseSubmission: findMatches(codeFiles, /submit|create case|create market|open case|claim/gi),
    resolution: findMatches(codeFiles, /resolve|decision|verdict|finalize|adjudicat/gi),
    tests: findMatches(files, /pytest|describe\s*\(|it\s*\(|test\s*\(/g),
    ci: findMatches(files, /name:\s|on:\s*push|pytest|npm run|pnpm|yarn/gi),
  };

  const workflowFiles = files
    .map((file) => file.path)
    .filter((name) => /^app\//.test(name) || /^src\//.test(name) || /^lib\//.test(name) || /^agents\//.test(name));

  const contractFiles = files
    .map((file) => file.path)
    .filter((name) => /^contracts\//.test(name) || (/\.py$/i.test(name) && /contract|genlayer/i.test(name)));

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
    Boolean(readmeFile) &&
    (evidence.tests.length > 0 || files.some((file) => file.path.startsWith(".github/workflows/")));

  const readmeSignals = {
    mentionsGenLayer: /genlayer/i.test(readme),
    explainsFit: /judgment|adjudication|evidence|ambiguity|oracle|resolve|nondetermin|validator/i.test(readme),
    explainsWorkflow: /workflow|flow|deploy|submit|resolve|read|write|contract|verify/i.test(readme),
  };

  const flowChecks = {
    deploy: evidence.deployContract.length > 0,
    submit: evidence.writeContract.length > 0 || evidence.caseSubmission.length > 0,
    resolve: evidence.resolution.length > 0 || evidence.nondetPrompt.length > 0 || evidence.nondetWeb.length > 0,
    claim: evidence.claimRelease.length > 0,
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
    files,
    codeFiles,
    readmePath: readmeFile?.path || null,
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

function classifySignals(signals) {
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

  return { verdict, risks, hasRealWorkflow };
}

function buildFixPlan(signals, classification) {
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
  if (!flowChecks.claim) {
    items.push({
      priority: "P1",
      area: "client",
      action: "Add a claim-release flow or an explicit post-resolution payout path so reviewers can verify the final escrow outcome.",
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
      action: "Rewrite the README to explain why the project belongs on GenLayer and show deploy -> submit -> resolve -> claim -> read-back verification.",
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
  for (const risk of classification.risks) {
    lines.push(`- ${risk}`);
  }
  lines.push("");
  lines.push("## Recommended Fixes");
  lines.push("");
  for (const item of plan) {
    lines.push(`- ${item.priority} ${item.area}: ${item.action}`);
  }
  return lines.join("\n");
}

function buildAgentResult(source, profile, signals, classification, fixPlan, repoMeta) {
  return {
    profile: profile.name,
    goal: profile.goal,
    summary: {
      source,
      profile: profile.name,
      verdict: classification.verdict,
      fitScore: signals.checks.fitScore,
      defaultBranch: repoMeta.defaultBranch,
      description: repoMeta.description,
      stars: repoMeta.stars,
    },
    checks: {
      meaningfulNondeterminism: signals.checks.hasMeaningfulNondet,
      appToContractPath: signals.checks.hasExecutionPath,
      observableOutcome: signals.checks.hasObservableOutcome,
      reviewerProof: signals.checks.hasReviewerProof,
    },
    flow: signals.flowChecks,
    risks: classification.risks,
    fixPlan,
    reviewerNotes: [
      signals.readmeSignals.explainsFit
        ? "README explains GenLayer fit."
        : "README should better explain why this project belongs on GenLayer.",
      signals.checks.hasReviewerProof
        ? "Tests or CI signals are present."
        : "Tests or CI signals are weak.",
    ],
    evidence: {
      nondeterminism: [
        ...signals.evidence.nondetPrompt,
        ...signals.evidence.nondetWeb,
        ...signals.evidence.nondetConsensus,
        ...signals.evidence.publicWrite,
      ].slice(0, 6),
      execution: [
        ...signals.evidence.deployContract,
        ...signals.evidence.writeContract,
        ...signals.evidence.claimRelease,
        ...signals.evidence.readContract,
        ...signals.evidence.waitReceipt,
      ].slice(0, 6),
      outcome: [
        ...signals.evidence.publicView,
        ...signals.evidence.statePersistence,
        ...signals.evidence.resolution,
      ].slice(0, 6),
    },
    markdown: buildMarkdown(source, signals, classification, fixPlan),
    recommendedTools: [
      "judge-genlayer-builder.mjs",
      "scan-nondeterminism.mjs",
      "find-missing-flow.mjs",
      "generate-fix-plan.mjs",
      "create-submission-report.mjs",
    ],
  };
}

export async function analyzeGitHubRepo(input, profileName = "coach") {
  const repoRef = parseGitHubUrl(input);
  const profile = PROFILES[profileName] || PROFILES.coach;
  const repoMeta = await loadRepoFiles(repoRef.owner, repoRef.repo);
  const signals = collectSignalsFromFiles(repoMeta.files);
  const classification = classifySignals(signals);
  const fixPlan = buildFixPlan(signals, classification);
  return buildAgentResult(repoMeta.source, profile, signals, classification, fixPlan, repoMeta);
}
